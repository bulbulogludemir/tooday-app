"use client";

import { useChat } from "@ai-sdk/react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
  type UIMessage,
} from "ai";
import { Check, ChevronDown, Loader2, SendHorizontal, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { renderInline } from "@/components/ai/markdown";
import ToolCard, { type ToolPartLike } from "@/components/ai/ToolCard";
import { isAreaTool } from "@/lib/ai/areaTools";
import { executeAreaTool } from "@/lib/ai/executeAreaTool";
import { executeTool, serializeResult } from "@/lib/ai/executeTool";
import { AI_MODELS, isWriteTool, type AiModelId } from "@/lib/ai/tools";
import { dayKey } from "@/lib/time";
import { useAreasStore } from "@/stores/useAreasStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { useToastStore } from "@/stores/useToastStore";

const COACH_DEFAULT_MODEL: AiModelId = "openai/gpt-5.5";

// Read at request time by each area's transport; written from the picker.
const coachModels: Record<string, AiModelId> = {};

function makeTransport(areaId: string) {
  return new DefaultChatTransport({
    api: "/api/chat",
    prepareSendMessagesRequest: ({ messages }) => {
      const s = useAreasStore.getState();
      const area = s.areas.find((a) => a.id === areaId);
      return {
        body: {
          // memory note + blocks carry long-term context; only recent
          // messages travel.
          messages: messages.slice(-20),
          modelId: coachModels[areaId] ?? COACH_DEFAULT_MODEL,
          context: {
            now: new Date().toString(),
            today: dayKey(),
            clockFormat: useSettingsStore.getState().clockFormat,
          },
          area: {
            id: areaId,
            name: area?.name ?? "",
            memory: s.memories[areaId] ?? "",
            blocksJson: JSON.stringify(s.blocks[areaId] ?? []).slice(0, 12000),
          },
        },
      };
    },
  });
}

export default function AreaCoach({ areaId }: { areaId: string }) {
  const [input, setInput] = useState("");
  const [modelId, setModelId] = useState<AiModelId>(
    coachModels[areaId] ?? COACH_DEFAULT_MODEL,
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const setChat = useAreasStore((s) => s.setChat);
  const hasBlocks = useAreasStore((s) => (s.blocks[areaId] ?? []).length > 0);

  const [transport] = useState(() => makeTransport(areaId));
  const [initialMessages] = useState(
    () => (useAreasStore.getState().chats[areaId] ?? []) as UIMessage[],
  );

  const { messages, sendMessage, status, error, clearError, addToolOutput } =
    useChat({
      transport,
      messages: initialMessages,
      sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
      onToolCall: ({ toolCall }) => {
        if (isAreaTool(toolCall.toolName)) {
          // The coach's own canvas: applies instantly, visible live.
          const result = executeAreaTool(areaId, toolCall.toolName, toolCall.input);
          addToolOutput({
            tool: toolCall.toolName as never,
            toolCallId: toolCall.toolCallId,
            output: serializeResult(result) as never,
          });
          return;
        }
        // Planner reads run immediately; planner writes wait for approval.
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

  // Persist history when a turn settles (zustand is the external system here).
  useEffect(() => {
    if (status === "ready" && messages.length > 0) {
      setChat(areaId, messages as unknown[]);
    }
  }, [status, messages, areaId, setChat]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

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

  const suggestions = hasBlocks
    ? ["Review and tidy this area", "What should I focus on this week?"]
    : ["Set up this area with me", "What should we track here?"];

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
        <Sparkles size={14} className="text-accent" />
        <span className="font-display text-sm font-semibold">Coach</span>
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
              className="elev-2 z-[70] w-48 rounded-lg border-t border-white/[0.07] bg-surface-2/90 p-1 backdrop-blur-md"
            >
              {AI_MODELS.map((m) => (
                <DropdownMenu.Item
                  key={m.id}
                  onSelect={() => {
                    coachModels[areaId] = m.id;
                    setModelId(m.id);
                  }}
                  className="flex cursor-pointer items-center gap-2 rounded px-2.5 py-1.5 text-xs outline-none data-[highlighted]:bg-white/5"
                >
                  <span className="w-3">
                    {modelId === m.id && <Check size={12} />}
                  </span>
                  {m.label}
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-4 pb-8 text-center">
            <p className="max-w-[230px] text-sm leading-relaxed text-muted">
              Your coach for this area — it builds and maintains everything on
              the left.
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
          placeholder="Talk to your coach…"
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
    </div>
  );
}
