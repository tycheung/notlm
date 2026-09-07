# Workflow Assistant

Plug-and-play **workflow coach** for SPAs: deterministic NLU, `data-guide-id` coaching, optional **chat FAB** + **command palette**, plus a Playwright **mapper** that inventories controls to help generate domain packs.

See `docs/PLAN.md` for goals / non-goals and `ARCHITECTURE.md` for bundle boundaries.

## Status

Bootstrap / planning. Not published yet. Working package scope: `@workflow-assistant/*`.

## Quick links

- Cursor constitution: `.cursor/rules/typescript-slice-master.mdc`
- Progress: `docs/PROGRESS.md`
- Backlog: `docs/SLICE_BACKLOG.md`
- ADR-000: `docs/adr/000-north-star.md`

## Consumer sketch (target API)

```tsx
import { WorkflowAssistantProvider, WorkflowAssistantHost } from '@workflow-assistant/react';

<WorkflowAssistantProvider
  pack={pack}
  getContext={getContext}
  navigate={navigate}
  features={{ chat: true, palette: true, spotlight: true, voice: true }}
>
  <App />
  <WorkflowAssistantHost />
</WorkflowAssistantProvider>
```
