"use client";

import { useChat } from "@ai-sdk/react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  ChevronDown,
  Loader2,
  SendHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { executeTool, serializeResult } from "@/lib/ai/executeTool";
import {
  AI_MODELS,
  DEFAULT_MODEL_ID,
  isWriteTool,
  type AiModelId,
} from "@/lib/ai/tools";
import { dayKey, minutesToHHmm, nowMinutes } from "@/lib/time";
import { usePlanStore } from "@/stores/usePlanStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { useToastStore } from "@/stores/useToastStore";
import { renderInline } from "./markdown";
import ToolCard, { type ToolPartLike } from "./ToolCard";

const MODEL_HINTS: Record<AiModelId, string> = {
  "google/gemini-3.5-flash": "fastest",
  "openai/gpt-5.5": "balanced",
  "anthropic/claude-opus-4.8": "deepest",
};

/** Suggestions follow the actual state of the day, not canned demos. */
function buildSuggestions(): string[] {
  const { plans, todos } = usePlanStore.getState();
  const today = plans[dayKey()] ?? [];
  const now = nowMinutes();
  const current = today.find((a) => a.start <= now && now < a.start + a.duration);
  const next = today.find((a) => a.start > now);
  const undone = todos.filter((t) => !t.done).length;

  const s: string[] = [];
  if (today.length === 0) {
    s.push(now < 12 * 60 ? "Plan my day" : "Plan the rest of my day");
  } else if (next) {
    s.push(`What's after ${minutesToHHmm(next.start)}?`);
  } else {
    s.push("How did my day go?");
  }
  if (undone > 0) s.push(`Which of my ${undone} todos should I do now?`);
  if (now >= 18 * 60) s.push("Draft tomorrow from today's plan");
  if (current) s.push(`Start a focus session for ${current.name}`);
  s.push("Tidy up my categories");
  return s.slice(0, 3);
}

// Read at request time by the transport; written from the model picker.
let currentModelId: AiModelId = DEFAULT_MODEL_ID;

const transport = new DefaultChatTransport({
  api: "/api/chat",
  prepareSendMessagesRequest: ({ messages }) => ({
    body: {
      messages,
      modelId: currentModelId,
      context: {
        now: new Date().toString(),
        today: dayKey(),
        clockFormat: useSettingsStore.getState().clockFormat,
      },
    },
  }),
});

export default function ChatPanel() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [modelId, setModelId] = useState<AiModelId>(DEFAULT_MODEL_ID);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const openPanel = () => {
    setSuggestions(buildSuggestions());
    setOpen(true);
  };

  const { messages, sendMessage, status, error, clearError, addToolOutput } =
    useChat({
      transport,
      sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
      onToolCall: ({ toolCall }) => {
        // Read tools run immediately; write tools wait for Apply/Reject.
        if (isWriteTool(toolCall.toolName)) return;
        const result = executeTool(toolCall.toolName, toolCall.input);
        addToolOutput({
          tool: toolCall.toolName as never,
          toolCallId: toolCall.toolCallId,
          output: serializeResult(result) as never,
        });
      },
    });

  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const applyTool = (toolCallId: string, toolName: string, input: unknown) => {
    const result = executeTool(toolName, input);
    if (result.ok) {
      useToastStore
        .getState()
        .show(
          result.summary,
          result.undo
            ? { actionLabel: "Undo", onAction: result.undo }
            : undefined,
        );
    }
    addToolOutput({
      tool: toolName as never,
      toolCallId,
      output: serializeResult(result) as never,
    });
  };

  const rejectTool = (toolCallId: string, toolName: string) => {
    addToolOutput({
      tool: toolName as never,
      toolCallId,
      output: { ok: false, error: "User rejected this action." } as never,
    });
  };

  const submit = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    clearError();
    void sendMessage({ text: trimmed });
    setInput("");
  };

  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.button
            key="ai-fab"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={openPanel}
            aria-label="Open AI assistant"
            className="glass elev-2 fixed bottom-6 right-6 z-[45] flex h-11 w-11 items-center justify-center rounded-full text-accent hover:bg-white/10"
          >
            <Sparkles size={18} />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.aside
            key="ai-panel"
            initial={{ x: 32, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 32, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="elev-3 fixed bottom-3 right-3 top-3 z-[60] flex w-[min(400px,calc(100vw-24px))] flex-col overflow-hidden rounded-2xl border-t border-white/[0.07] bg-surface/85 backdrop-blur-2xl"
          >
            <header className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
              <Sparkles size={15} className="text-accent" />
              <span className="font-display text-sm font-semibold">
                Assistant
              </span>
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button
                    aria-label="Model"
                    className="ml-auto flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-xs text-neutral-300 transition-colors hover:bg-white/10"
                  >
                    {AI_MODELS.find((m) => m.id === modelId)?.label}
                    <ChevronDown size={12} className="text-muted" />
                  </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content
                    align="end"
                    sideOffset={8}
                    className="elev-2 z-[70] w-52 rounded-lg border-t border-white/[0.07] bg-surface-2/90 p-1 backdrop-blur-md"
                  >
                    <DropdownMenu.Label className="px-2.5 py-1 text-[10px] uppercase tracking-wide text-muted/60">
                      Model
                    </DropdownMenu.Label>
                    {AI_MODELS.map((m) => (
                      <DropdownMenu.Item
                        key={m.id}
                        onSelect={() => {
                          currentModelId = m.id;
                          setModelId(m.id);
                        }}
                        className="flex cursor-pointer items-center gap-2 rounded px-2.5 py-1.5 text-xs outline-none data-[highlighted]:bg-white/5"
                      >
                        <span className="w-3">
                          {modelId === m.id && <Check size={12} />}
                        </span>
                        {m.label}
                        <span className="ml-auto text-[10px] text-muted/70">
                          {MODEL_HINTS[m.id]}
                        </span>
                      </DropdownMenu.Item>
                    ))}
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-white/5 hover:text-foreground"
              >
                <X size={15} />
              </button>
            </header>

            <div
              ref={scrollRef}
              className="flex-1 space-y-4 overflow-y-auto px-4 py-4"
            >
              {messages.length === 0 && (
                <div className="flex h-full flex-col items-center justify-center gap-5 pb-10 text-center">
                  <div className="glass flex h-12 w-12 items-center justify-center rounded-full">
                    <Sparkles size={18} className="text-accent" />
                  </div>
                  <p className="max-w-[240px] text-sm leading-relaxed text-muted">
                    Your plan, todos and pomodoro — ask anything, or hand the
                    day over.
                  </p>
                  <div className="flex flex-col items-center gap-2">
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        onClick={() => submit(s)}
                        className="rounded-full bg-surface-2 px-3.5 py-1.5 text-xs text-neutral-300 transition-colors hover:bg-white/10 hover:text-foreground"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-muted/60">
                    Changes apply only after you approve them.
                  </p>
                </div>
              )}

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex flex-col gap-2 ${
                    message.role === "user" ? "items-end" : "items-start"
                  }`}
                >
                  {message.parts.map((part, i) => {
                    if (part.type === "text") {
                      return (
                        <div
                          key={`${message.id}-${i}`}
                          className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm ${
                            message.role === "user"
                              ? "bg-[var(--accent-strong)]/80 text-white"
                              : "bg-surface-2 text-foreground"
                          }`}
                        >
                          {renderInline(part.text)}
                        </div>
                      );
                    }
                    if (part.type.startsWith("tool-")) {
                      return (
                        <ToolCard
                          key={`${message.id}-${i}`}
                          part={part as unknown as ToolPartLike}
                          onApply={applyTool}
                          onReject={rejectTool}
                        />
                      );
                    }
                    return null;
                  })}
                </div>
              ))}

              {busy && (
                <div className="flex items-center gap-1.5 text-xs text-muted">
                  <Loader2 size={12} className="animate-spin" /> Thinking…
                </div>
              )}

              {error && (
                <div className="rounded-xl border border-red-400/20 bg-red-400/5 px-3 py-2 text-xs text-red-400">
                  {error.message || "Something went wrong."}
                </div>
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                submit(input);
              }}
              className="flex items-center gap-2 border-t border-white/[0.06] px-4 py-3"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Message…"
                className="h-11 w-full rounded-lg border border-transparent bg-surface-2 px-3.5 text-sm outline-none transition-colors placeholder:text-muted/60 focus:border-accent/60"
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                aria-label="Send"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-strong)] text-white transition-[filter] hover:brightness-110 disabled:opacity-40"
              >
                <SendHorizontal size={15} />
              </button>
            </form>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
