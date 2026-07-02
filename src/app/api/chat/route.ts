import { convertToModelMessages, stepCountIs, streamText } from "ai";
import type { UIMessage } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { areaTools } from "@/lib/ai/areaTools";
import { AI_MODELS, chatTools } from "@/lib/ai/tools";

export const maxDuration = 60;

type ChatContext = { now?: string; today?: string; clockFormat?: string };

type AreaContext = {
  id: string;
  name: string;
  memory: string;
  blocksJson: string;
};

type ChatRequestBody = {
  messages: UIMessage[];
  modelId: string;
  context?: ChatContext;
  area?: AreaContext;
};

function systemPrompt(context: ChatContext | undefined): string {
  return [
    "You are the assistant inside tooday, a clock-first daily planner app.",
    "The user's data: a per-day schedule of activities (title, start time, duration, category), a todo list, and a pomodoro timer (25min focus / 5min break).",
    context?.now ? `Current local time: ${context.now}.` : "",
    context?.today ? `Today's date key: ${context.today}.` : "",
    context?.clockFormat
      ? `The user displays times in ${context.clockFormat} format.`
      : "",
    "Rules:",
    "- Always read current data with tools (get_plan, get_todos, get_categories, get_templates, get_settings) before answering questions about it or modifying it. Never guess ids.",
    "- You can fully manage categories (create/rename/recolor/delete), day templates, copy days, and change app settings — use those tools instead of telling the user to do it manually.",
    "- When a needed category does not exist, propose add_category first, then assign it.",
    "- Modifying tools require the user to approve each call in the UI; if a tool result says the user rejected it, do not retry — ask what they want instead.",
    "- If add_activity fails due to overlap, offer the suggested free slot.",
    "- Times in tool inputs are 24h HH:mm. Day keys are YYYY-MM-DD.",
    "- Be concise. Reply in the language the user writes in.",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Coach persona for a life area. Area content comes from the client and is
 * length-capped; the coach curates it via area_* tools without approval. */
function coachPrompt(area: AreaContext, context: ChatContext | undefined): string {
  return [
    `You are the user's personal coach for their "${area.name}" life area inside tooday, a clock-first daily planner.`,
    "You own this area's content: a set of typed blocks (note, table, metric, routine, checklist, links) shown live next to this chat. The user mostly reads it — you keep it organized, current, and genuinely useful. Curate proactively with the area_* tools; they apply instantly without approval.",
    "If the area is empty or new, run a short interview (one question at a time) to understand goals and current state, then seed the first blocks yourself.",
    "Record durable facts, goals, preferences, and decisions with area_update_memory — it and the blocks below are your long-term memory; older chat messages are not resent.",
    "To schedule real work (activities, todos, pomodoro), use the planner tools; those show the user an approval card first.",
    context?.now ? `Current local time: ${context.now}.` : "",
    context?.today ? `Today's date key: ${context.today}.` : "",
    "Times in planner tool inputs are 24h HH:mm; day keys are YYYY-MM-DD.",
    "Be a coach: concrete, encouraging, honest about trade-offs. Reply in the language the user writes in.",
    "",
    `## Your memory note\n${area.memory || "(empty)"}`,
    "",
    `## Current blocks (JSON)\n${area.blocksJson || "[]"}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function sanitizeArea(area: AreaContext | undefined): AreaContext | undefined {
  if (!area || typeof area !== "object") return undefined;
  if (typeof area.id !== "string" || area.id.length > 20) return undefined;
  if (typeof area.name !== "string" || area.name.length > 60) return undefined;
  return {
    id: area.id,
    name: area.name.replace(/[\r\n]/g, " "),
    memory: typeof area.memory === "string" ? area.memory.slice(0, 4000) : "",
    blocksJson:
      typeof area.blocksJson === "string" ? area.blocksJson.slice(0, 12000) : "",
  };
}

/**
 * Sanitize client-supplied prompt context: only known shapes reach the
 * system prompt, so a tampered request can't inject prompt lines.
 */
function sanitizeContext(context: ChatContext | undefined): ChatContext {
  if (!context || typeof context !== "object") return {};
  const clean: ChatContext = {};
  if (
    typeof context.now === "string" &&
    context.now.length <= 80 &&
    !/[\r\n]/.test(context.now)
  ) {
    clean.now = context.now;
  }
  if (typeof context.today === "string" && /^\d{4}-\d{2}-\d{2}$/.test(context.today)) {
    clean.today = context.today;
  }
  if (context.clockFormat === "24h" || context.clockFormat === "12h") {
    clean.clockFormat = context.clockFormat;
  }
  return clean;
}

const MAX_MESSAGES = 100;

export async function POST(req: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "AI is not configured (missing OPENROUTER_API_KEY)." },
      { status: 503 },
    );
  }

  // Until real auth ships with the SaaS layer, a self-hosted deploy can set
  // CHAT_ACCESS_TOKEN to keep this endpoint (and its OpenRouter spend) private.
  // Unset = open, intended for localhost use only.
  const accessToken = process.env.CHAT_ACCESS_TOKEN;
  if (accessToken && req.headers.get("x-chat-token") !== accessToken) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: ChatRequestBody;
  try {
    body = (await req.json()) as ChatRequestBody;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { messages, modelId } = body;
  const context = sanitizeContext(body.context);
  const area = sanitizeArea(body.area);
  if (!AI_MODELS.some((m) => m.id === modelId)) {
    return Response.json(
      { error: `Unknown model "${modelId}".` },
      { status: 400 },
    );
  }
  if (
    !Array.isArray(messages) ||
    messages.length === 0 ||
    messages.length > MAX_MESSAGES
  ) {
    return Response.json(
      { error: `messages must be a non-empty array of at most ${MAX_MESSAGES}.` },
      { status: 400 },
    );
  }

  const openrouter = createOpenRouter({ apiKey });

  const result = streamText({
    model: openrouter.chat(modelId),
    system: area ? coachPrompt(area, context) : systemPrompt(context),
    messages: await convertToModelMessages(messages),
    tools: area ? { ...chatTools, ...areaTools } : chatTools,
    stopWhen: stepCountIs(10),
  });

  return result.toUIMessageStreamResponse({
    // Surface a single readable line (e.g. "insufficient credits") without
    // leaking stacks or response internals.
    onError: (error) =>
      error instanceof Error
        ? error.message.split("\n")[0].slice(0, 200)
        : "The model request failed.",
  });
}
