# Contributing

tooday is early and local-first. Keep changes small, reversible, and aligned
with the existing clock/planner surface.

## Local Checks

```bash
npm ci
npm run lint
npm run test
npm run build
```

## Product Rules

- Do not add hosted accounts, subscriptions, or telemetry as a default path.
- Keep AI optional and BYOK-first.
- Do not move private user data to a server without an explicit setting and a
  clear migration path.
- Keep the planner useful without AI.
- Update `wiki/` when a change creates durable architecture or product
  knowledge.

## Pull Requests

- Explain the user-facing change.
- Call out storage, privacy, or self-hosting implications.
- Include screenshots for visible UI changes.
- Mention which checks were run.
