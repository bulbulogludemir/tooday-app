"use client";

import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, SendHorizontal, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { executeTool, serializeResult } from "@/lib/ai/executeTool";
import {
  AI_MODELS,
  DEFAULT_MODEL_ID,
  isWriteTool,
  type AiModelId,
} from "@/lib/ai/tools";
import { dayKey } from "@/lib/time";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { useToastStore } from "@/stores/useToastStore";
import ToolCard, { type ToolPartLike } from "./ToolCard";

const SUGGESTIONS = [
  "What's on my plan today?",
  "Add a 1 hour workout tomorrow morning",
  "Start a focus session",
];

/** Minimal inline markdown: only **bold**, since models emit it constantly. */
function renderInline(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className="font-semibold">
        {part.slice(2, -2)}
      </strong>
    ) : (
      part
    ),
  );
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
  const scrollRef = useRef<HTMLDivElement>(null);

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
            onClick={() => setOpen(true)}
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
            initial={{ x: 48, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 48, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="elev-3 fixed inset-y-0 right-0 z-[60] flex w-full flex-col border-l border-white/[0.07] bg-surface/90 backdrop-blur-2xl sm:w-[400px]"
          >
            <header className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
              <Sparkles size={16} className="text-accent" />
              <span className="font-display text-sm font-semibold">
                Assistant
              </span>
              <select
                value={modelId}
                onChange={(e) => {
                  const next = e.target.value as AiModelId;
                  currentModelId = next;
                  setModelId(next);
                }}
                className="ml-auto rounded-lg bg-surface-2 px-2 py-1.5 text-xs text-neutral-300 outline-none focus:border-accent/60"
                aria-label="Model"
              >
                {AI_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="rounded-full p-1.5 text-muted hover:bg-white/5 hover:text-foreground"
              >
                <X size={16} />
              </button>
            </header>

            <div
              ref={scrollRef}
              className="flex-1 space-y-4 overflow-y-auto px-4 py-4"
            >
              {messages.length === 0 && (
                <div className="mt-8 flex flex-col items-center gap-4 text-center">
                  <p className="text-sm text-muted">
                    Ask about your day, or tell me what to plan.
                  </p>
                  <div className="flex flex-col gap-2">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => submit(s)}
                        className="rounded-full bg-surface-2 px-3 py-1.5 text-xs text-neutral-300 hover:bg-white/10"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
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
                className="h-10 w-full rounded-lg border border-transparent bg-surface-2 px-3 text-sm outline-none transition-colors placeholder:text-muted/60 focus:border-accent/60"
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                aria-label="Send"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-strong)] text-white hover:brightness-110 disabled:opacity-40"
              >
                <SendHorizontal size={16} />
              </button>
            </form>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
