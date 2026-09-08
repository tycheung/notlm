# UiPilot

**UI, but for you** — pilot the UI with a plug-and-play coach for SPAs: deterministic **runtime** NLU, `data-guide-id` coaching, optional **chat FAB** + **command palette**. Build tooling writes **JSON only** into a single host folder (`.uipilot/`) — inventory, structured DAG draft, checklist, and pack config — with optional **LLM-assisted** pack drafting (BYO / Ollama; never on the runtime hot path).

See `docs/PLAN.md` for goals / non-goals and `ARCHITECTURE.md` for bundle boundaries.

## Status

Implementation in progress (not published). Package scope: `@uipilot/*`. CLI: `uipilotCLI`.

## Quick links

- Cursor constitution: `.cursor/rules/typescript-slice-master.mdc`
- Progress: `docs/PROGRESS.md`
- Backlog: `docs/SLICE_BACKLOG.md`
- ADR-000: `docs/adr/000-north-star.md`

## Consumer sketch (target API)

```tsx
import { UiPilotProvider, UiPilotHost } from '@uipilot/react';

<UiPilotProvider
  pack={pack}
  getContext={getContext}
  navigate={navigate}
  features={{ chat: true, palette: true, spotlight: true, voice: true }}
>
  <App />
  <UiPilotHost />
</UiPilotProvider>
```
