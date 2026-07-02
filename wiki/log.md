# Wiki Log

## [2026-07-02] bootstrap | LLM Wiki initialized

Created the standard LLMiki layout and seeded schema, index, open questions,
health, source summaries, concepts, and product synthesis.

## [2026-07-02] publish | GitHub repository documentation prepared

Added README, screenshots, license, contribution/security docs, self-hosting
notes, BYOK roadmap, and a publish summary for the public repository pass.

## [2026-07-02] design | AI chat panel approved; BYOK superseded by SaaS/server-key

Direction change: SaaS launch planned, AI uses a server-side OpenRouter key.
Approved design for an agentic chat panel (3 models, client-executed tools,
confirmation before writes) in
`docs/superpowers/specs/2026-07-02-ai-chat-panel-design.md`.

## [2026-07-02] feature | AI chat panel shipped

Agentic chat drawer on all pages: OpenRouter server key, 3-model picker
(Gemini 3.5 Flash default, GPT-5.5, Opus 4.8), schema-only tools executed
client-side against zustand stores, approval cards before every write.
Verified end-to-end with Playwright against live models: read tools,
apply/reject flow, no-write-before-approval, model switching.

## [2026-07-02] feature | Life areas with AI coaches shipped

/areas: user-created life areas (health, finance, …), each curated by a
persistent AI coach. Six typed blocks (note, table, metric+sparkline, routine,
checklist, links) written live without approval; planner writes keep approval
cards. Memory note + last-20-messages context model. Fixed a blockId:"" upsert
collision found in live E2E.
