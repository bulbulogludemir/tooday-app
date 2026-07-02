# AI Chat Panel — Design

Date: 2026-07-02
Status: approved

## Goal

Add an agentic AI assistant to tooday: a slide-in chat panel available from
every page, with three selectable models via OpenRouter, able to read and
modify the user's plan, todos, and pomodoro through tool calling — with
explicit user confirmation before any write.

## Product Decisions

- Direction change: tooday will eventually launch as SaaS. The AI layer uses a
  **server-side OpenRouter key** (`OPENROUTER_API_KEY` in `.env.local`,
  gitignored), not BYOK. The wiki BYOK concept is updated to record this.
- Models (verified against the OpenRouter live model list):
  - `google/gemini-3.5-flash` (default — fast and cheap)
  - `openai/gpt-5.5`
  - `anthropic/claude-opus-4.8`
- Write actions always require confirmation ("Önce onay istesin").
- Conversation history is session-only for v1; persistence is v2.

## Architecture

New dependencies: `ai` (Vercel AI SDK), `@openrouter/ai-sdk-provider`, `zod`.

- `src/app/api/chat/route.ts` — POST handler. Reads `{ messages, modelId }`,
  validates `modelId` against the allowlist above, calls `streamText` with the
  OpenRouter provider and returns a UI-message stream. Returns a clear error
  if `OPENROUTER_API_KEY` is unset.
- Tools are declared in the route **without `execute`** so every tool call is
  forwarded to the client, where the data lives (zustand + localStorage).
  Tool input schemas are shared between server and client from
  `src/lib/ai/tools.ts` (zod).
- `src/lib/ai/executeTool.ts` — pure client-side bridge mapping a tool call to
  zustand store reads/actions. Unit-testable.
- `src/components/ai/ChatPanel.tsx` — floating button (bottom-right) opening a
  right-side slide-in panel (full-screen on mobile), Radix Dialog +
  framer-motion, matching the existing visual language. Header holds the
  model picker. Uses `useChat` from `ai/react`.
- `src/components/ai/ToolCard.tsx` — renders tool calls in the transcript.

## Tools

Read (auto-executed, no confirmation):

- `get_plan` — activities for a given day/range, with categories.
- `get_todos` — current todos.
- `get_categories` — category list.
- `get_pomodoro_status` — running/idle state.

Write (confirmation card required):

- `add_activity`, `update_activity`, `delete_activity`
- `add_todo`, `complete_todo`, `delete_todo`
- `start_pomodoro`, `stop_pomodoro`

## Confirmation Flow

A write tool call renders a preview card describing the change in plain
language with **Uygula / Reddet** buttons. Apply → run the store action, send
a success tool result, the model continues. Reject → send a "user rejected"
tool result. No write ever executes without the user pressing Uygula.

## Data Flow & Privacy

The server stores nothing. Plan data leaves the browser only as tool results
when the model requests a read. The system prompt includes current date/time
and the app's domain vocabulary, never the full store.

## Error Handling

- OpenRouter/credit errors → readable error bubble in the chat.
- Invalid tool input → tool result carries the validation error; model retries.
- Missing API key → "AI yapılandırılmamış" state in the panel.

## Testing

- Unit tests (vitest): tool schemas, `executeTool` against real store
  instances (add/update/delete paths, rejection path).
- Manual verification: streaming, model switching, confirm/reject flow.
