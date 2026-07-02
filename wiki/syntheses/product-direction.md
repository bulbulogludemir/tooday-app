# Product Direction

tooday is a local-first clock planner.

## Settled For Now

- Open source public repo.
- Long-term goal changed on 2026-07-02: launch as SaaS once the app is
  complete. AI uses a server-side OpenRouter key, not BYOK.
- The clock-first planner is the core surface.
- AI is an optional agentic chat panel behind the core planner
  (see [[byok-ai-layer]] for the superseded BYOK shape).

## Current Boundary

The app already has a rich local planner surface, but cross-device sync and BYOK
AI are not shipped yet. Documentation should keep those as roadmap items until
implementation lands.

## Practical Next Steps

1. Add export/import for plans and settings.
2. Design a SQLite-backed self-host store and migration path.
3. Add the smallest useful BYOK AI draft-planning route.
4. Decide whether local Codex account integration is a repo feature or external
   workflow.

## Source Links

- [Project brief](../sources/project-brief-2026-07-02.md)
- [Current codebase](../sources/current-codebase-2026-07-02.md)
