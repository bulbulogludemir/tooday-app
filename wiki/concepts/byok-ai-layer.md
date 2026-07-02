# BYOK AI Layer

BYOK means users bring their own model provider key. tooday should not require a
hosted subscription to use AI.

## Current Status

Not implemented.

## Intended Shape

- AI is optional.
- Provider credentials are owned by the user.
- Provider adapters should be isolated from the core planner.
- Generated schedule changes should be drafts until accepted.
- The UI should show what context was sent to a model.

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
