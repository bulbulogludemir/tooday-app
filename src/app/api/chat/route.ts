import { convertToModelMessages, stepCountIs, streamText } from "ai";
import type { UIMessage } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { AI_MODELS, chatTools } from "@/lib/ai/tools";

export const maxDuration = 60;

type ChatContext = { now?: string; today?: string; clockFormat?: string };

type ChatRequestBody = {
  messages: UIMessage[];
  modelId: string;
  context?: ChatContext;
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
    "- Always read current data with tools (get_plan, get_todos, get_categories) before answering questions about it or modifying it. Never guess ids.",
    "- Modifying tools require the user to approve each call in the UI; if a tool result says the user rejected it, do not retry — ask what they want instead.",
    "- If add_activity fails due to overlap, offer the suggested free slot.",
    "- Times in tool inputs are 24h HH:mm. Day keys are YYYY-MM-DD.",
    "- Be concise. Reply in the language the user writes in.",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function POST(req: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "AI is not configured (missing OPENROUTER_API_KEY)." },
      { status: 503 },
    );
  }

  let body: ChatRequestBody;
  try {
    body = (await req.json()) as ChatRequestBody;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { messages, modelId, context } = body;
  if (!AI_MODELS.some((m) => m.id === modelId)) {
    return Response.json(
      { error: `Unknown model "${modelId}".` },
      { status: 400 },
    );
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json(
      { error: "messages must be a non-empty array." },
      { status: 400 },
    );
  }

  const openrouter = createOpenRouter({ apiKey });

  const result = streamText({
    model: openrouter.chat(modelId),
    system: systemPrompt(context),
    messages: await convertToModelMessages(messages),
    tools: chatTools,
    stopWhen: stepCountIs(10),
  });

  return result.toUIMessageStreamResponse({
    onError: (error) =>
      error instanceof Error ? error.message : "The model request failed.",
  });
}
