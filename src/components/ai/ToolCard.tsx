import { Check, Eye, Loader2, TriangleAlert, Wrench, X } from "lucide-react";
import { describeToolCall } from "@/lib/ai/executeTool";
import { isWriteTool } from "@/lib/ai/tools";

export type ToolPartLike = {
  type: string;
  toolCallId: string;
  state:
    | "input-streaming"
    | "input-available"
    | "output-available"
    | "output-error";
  input?: unknown;
  output?: unknown;
  errorText?: string;
};

type WireResult = {
  ok?: boolean;
  summary?: string;
  error?: string;
};

const READ_LABELS: Record<string, string> = {
  get_plan: "Reading the plan",
  get_todos: "Reading todos",
  get_categories: "Reading categories",
  get_pomodoro_status: "Reading pomodoro status",
};

export default function ToolCard({
  part,
  onApply,
  onReject,
}: {
  part: ToolPartLike;
  onApply: (toolCallId: string, toolName: string, input: unknown) => void;
  onReject: (toolCallId: string, toolName: string) => void;
}) {
  const toolName = part.type.slice("tool-".length);
  const write = isWriteTool(toolName);
  const output = (part.output ?? undefined) as WireResult | undefined;

  // Read tools: a subtle status chip.
  if (!write) {
    const label = READ_LABELS[toolName] ?? toolName;
    return (
      <div className="flex items-center gap-1.5 self-start rounded-full bg-surface-2 px-2.5 py-1 text-xs text-muted">
        {part.state === "output-available" ? (
          <Eye size={12} />
        ) : (
          <Loader2 size={12} className="animate-spin" />
        )}
        {label}
      </div>
    );
  }

  // Write tools: confirmation card lifecycle.
  const description = describeToolCall(toolName, part.input);

  if (part.state === "input-streaming") {
    return (
      <div className="flex items-center gap-1.5 self-start rounded-full bg-surface-2 px-2.5 py-1 text-xs text-muted">
        <Loader2 size={12} className="animate-spin" /> Preparing action…
      </div>
    );
  }

  if (part.state === "input-available") {
    return (
      <div className="glass elev-1 self-stretch rounded-xl border-t border-white/[0.07] p-3">
        <div className="flex items-start gap-2 text-sm">
          <Wrench size={14} className="mt-0.5 shrink-0 text-accent" />
          <span>{description}</span>
        </div>
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => onApply(part.toolCallId, toolName, part.input)}
            className="rounded-lg bg-[var(--accent-strong)] px-4 py-1.5 text-sm font-medium text-white hover:brightness-110"
          >
            Apply
          </button>
          <button
            onClick={() => onReject(part.toolCallId, toolName)}
            className="rounded-lg border border-white/10 px-4 py-1.5 text-sm text-neutral-300 hover:border-red-400/40 hover:text-red-400"
          >
            Reject
          </button>
        </div>
      </div>
    );
  }

  if (part.state === "output-available") {
    if (output?.ok) {
      return (
        <div className="flex items-center gap-1.5 self-start rounded-full bg-surface-2 px-2.5 py-1 text-xs text-emerald-400/90">
          <Check size={12} /> {output.summary ?? description}
        </div>
      );
    }
    const rejected = output?.error === "User rejected this action.";
    return (
      <div
        className={`flex items-center gap-1.5 self-start rounded-full bg-surface-2 px-2.5 py-1 text-xs ${
          rejected ? "text-muted" : "text-red-400/90"
        }`}
      >
        {rejected ? <X size={12} /> : <TriangleAlert size={12} />}
        {rejected ? "Rejected" : (output?.error ?? "Failed")}
      </div>
    );
  }

  // output-error (transport-level failure)
  return (
    <div className="flex items-center gap-1.5 self-start rounded-full bg-surface-2 px-2.5 py-1 text-xs text-red-400/90">
      <TriangleAlert size={12} /> {part.errorText ?? "Tool failed"}
    </div>
  );
}
