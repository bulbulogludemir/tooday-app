# BYOK AI Layer

BYOK means users bring their own model provider key.

## Current Status

**Superseded on 2026-07-02.** Product direction changed: tooday is planned to
launch as SaaS, so the AI layer uses a server-side OpenRouter key
(`OPENROUTER_API_KEY`, gitignored `.env.local`) instead of user-provided keys.
See the [AI chat panel design](../../docs/superpowers/specs/2026-07-02-ai-chat-panel-design.md).

## Retained Principles

- AI is optional; planner basics never depend on model availability.
- Provider adapters isolated from the core planner (single OpenRouter route).
- Schedule changes proposed by the model require user confirmation before
  they are applied.
- The server stores no plan data; context reaches the model only via
  client-executed read tools.

## Candidate First Feature

Natural-language planning from rough tasks and constraints, producing a draft
day plan with conflicts explained.

## Risks

- Accidentally sending private schedule data without clear scope.
- Making planner basics dependent on model availability.
- Mixing Codex account state with ordinary BYOK provider keys without a clear
  boundary.

## Source Links

- [Project brief](../sources/project-brief-2026-07-02.md)
- [BYOK docs](../../docs/local-ai-byok.md)
