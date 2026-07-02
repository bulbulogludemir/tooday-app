# Source Summary: Current Codebase - 2026-07-02

Local source: `/Users/demir/Projects/tooday`

## Observed Stack

- Next.js 16 App Router.
- React 19.
- Zustand persisted stores.
- Radix UI primitives.
- Framer Motion.
- Vitest unit tests.
- PWA registration and service worker file.

## Observed Surfaces

- `/`: clock-first day view.
- `/plan`: day/week planning view.
- `/todos`: todo management and activity tagging.
- `/report`: planned-time summary.

## Observed Persistence

`src/stores/usePlanStore.ts` uses Zustand persistence named `plan-storage`.
This means current planner data is browser-local.

## Verification In This Pass

- `npm run lint` passed.
- `npm run test` passed with 18 tests.
- `npm run build` passed.
- Production screenshots were captured from `http://localhost:3210`.

## Related Pages

- [[Local-first planner]]
- [Architecture docs](../../docs/architecture.md)
