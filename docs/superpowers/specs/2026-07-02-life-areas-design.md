# Life Areas + Area Coaches — Design

Date: 2026-07-02
Status: approved

## Goal

User-created life areas (Health, Finance, Learning, …), each a page whose
content is curated by an AI "coach" — the user mostly reads, the coach writes.
Each area has a persistent coach conversation with durable memory, and the
coach can push work into the daily plan/todos through the existing approval
flow.

## Decisions (from brainstorm)

- **Content = typed block catalog**, not bespoke per-domain widgets and not
  freeform markdown only. Six block types the coach composes:
  `note` (markdown), `table` (columns/rows), `metric` (unit + dated history,
  sparkline), `routine` (weekly program), `checklist`, `links`.
- **Coach memory = memory note + recent messages.** Full chat history is
  stored and displayed; the model receives the area's blocks + coach-managed
  memory note + last 20 messages.
- **Layout = content left, coach docked right** (`/areas/[id]`); mobile gets
  Content/Coach tabs. `/areas` lists area cards + creation. Sidebar gains an
  Areas item (Alt+5).
- **Authority split:** area blocks and memory are the coach's own canvas —
  written WITHOUT approval (visible live next to the chat; coach reverts on
  request). Anything touching the planner (activities/todos/pomodoro/
  categories/…) keeps the existing approval cards.
- Coach default model: `openai/gpt-5.5` (picker still offers all three).

## Data model — `src/stores/useAreasStore.ts` (persist `"areas-storage"`)

```ts
interface Area { id: string; name: string; icon: string; color: string; createdAt: string }

type AreaBlock =
  | { id: string; type: "note"; title: string; markdown: string }
  | { id: string; type: "table"; title: string; columns: string[]; rows: string[][] }
  | { id: string; type: "metric"; title: string; unit: string;
      history: { date: string; value: number }[] }
  | { id: string; type: "routine"; title: string; days: { day: string; items: string[] }[] }
  | { id: string; type: "checklist"; title: string;
      items: { id: string; text: string; done: boolean }[] }
  | { id: string; type: "links"; title: string;
      items: { label: string; url: string; note?: string }[] };

state: {
  areas: Area[];
  blocks: Record<string, AreaBlock[]>;      // keyed by areaId
  memories: Record<string, string>;         // coach-managed memory note
  chats: Record<string, unknown[]>;         // serialized UIMessage[]
}
actions: addArea (returns id), renameArea, deleteArea (cascades blocks/memory/
chat, Undo toast), upsertBlock (replace by id or append), deleteBlock,
setMemory, setChat, toggleChecklistItem (the one user-writable affordance).
```

## Coach tools (client-executed, no approval, active only in area mode)

`area_get`, `area_set_note`, `area_set_table`, `area_set_metric`,
`area_add_metric_point`, `area_set_routine`, `area_set_checklist`,
`area_set_links`, `area_delete_block`, `area_update_memory`.

Set-tools upsert: `blockId` present → replace that block (error if missing);
absent → create. Executor `executeAreaTool(areaId, toolName, input)` lives in
`src/lib/ai/areaTools.ts` (schemas) + `src/lib/ai/executeAreaTool.ts`.
The coach also gets ALL existing planner tools with their approval flow.

## API route changes (`/api/chat`)

Body gains `area?: { id, name, memory, blocksJson }` (client serializes its
blocks; server caps: name ≤ 60 chars, memory ≤ 4000, blocksJson ≤ 12000,
single-line name). When present: system prompt switches to the coach persona
(proactive curator: keep blocks tidy and current, record durable facts in
memory via area_update_memory, interview a new/empty area to seed it, use
planner tools — which require approval — to schedule actual work), and
`areaTools` are merged into the tool set.

## UI

- `src/app/areas/page.tsx` — area cards (icon, name, block count) +
  "New area" modal: name, icon (fixed lucide set of 10), color (COLOR_NAMES
  subset). Presets offered as one-tap chips (Health, Finance, Learning, Hobby).
- `src/app/areas/[id]/page.tsx` — header (icon, name, delete w/ Undo toast);
  left: blocks in CSS columns (1 col mobile / 2 col ≥ md within the content
  zone); right: `<AreaCoach areaId>` docked rail (lg fixed ~380px). Below lg:
  Content / Coach segmented tabs.
- `src/components/areas/BlockCard.tsx` — renders all six types in the app's
  glass language; checklist items are user-tickable; metric shows latest value
  + SVG sparkline of history.
- `src/components/areas/AreaCoach.tsx` — embedded chat: same message/ToolCard
  rendering as ChatPanel (shared bits extracted to `src/components/ai/shared`),
  per-area transport (sends areaId+context, last 20 messages), history loaded
  from and persisted to the store, model picker (default GPT-5.5), empty state
  with "Set up this area with me" primary chip.
- Sidebar: Areas nav item (`LayoutGrid`, Alt+5). Area tool calls render as
  quiet chips ("Updated Portfolio"), not approval cards.

## Error handling

Same as existing chat (error bubble, tool errors returned to model). Unknown
areaId in a tool call → error result. Deleting an area while its chat is open
→ route back to `/areas`.

## Testing

- Vitest: useAreasStore actions (add/delete cascade, upsert semantics,
  checklist toggle), executeAreaTool (create/update/delete blocks, metric
  point append, memory update, bad blockId, schema rejection).
- Playwright E2E (live model): create area → coach interview seeds blocks
  without approval cards → blocks render → memory updated → reload keeps chat
  history → planner write from coach still shows approval card.
