# Local-first Planner

tooday should make the useful planner loop work without accounts, hosted
services, subscriptions, or AI.

## Current Implementation

- Plans, categories, todos, templates, settings, and Pomodoro state persist in
  browser storage.
- The app can be served locally or from a self-hosted server with `next start`.
- Current storage is per browser profile.

## Product Principle

The clock and plan editing loop must stay useful before any AI, sync, or account
layer is added.

## Future Direction

- JSON export/import as the lowest-friction portability step.
- Optional SQLite-backed self-host sync.
- Explicit migration from browser-local state into server-backed storage.

## Source Links

- [Project brief](../sources/project-brief-2026-07-02.md)
- [Current codebase](../sources/current-codebase-2026-07-02.md)
