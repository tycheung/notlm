# UiPilot

**UI, but for you** — a plug-and-play **SPA chatbot frontline**: deterministic pack
NLU as a **smart cache**, optional **Laya** miss fallback, optional **LLM** backup,
plus chat FAB / command palette. **Coaching** (`data-guide-id` spotlight, step tours)
is one pack-driven pattern — not the product identity.

This repo is the **runtime**: `@uipilot/core`, `@uipilot/react`, `@uipilot/schema`,
`@uipilot/ranker` (infer), and a thin `uipilotCLI` (`init` / `validate` /
`intents check` / `ranker check`). Pack JSON and optional prebuilt ranker artifacts
are host-owned inputs.

```text
User utterance
  → pack smart cache (intents / FAQ / catalogs / discourse)
  → on miss: Laya (/decide)
  → on miss: optional host LLM (/uipilot/fallback)
  → reply + optional UI actions (navigate / spotlight / tour)
```

See `ARCHITECTURE.md` for bundle boundaries and [`docs/PACK_COOKBOOK.md`](docs/PACK_COOKBOOK.md) for host wire-up.

## Status

Implementation in progress (not published). Package scope: `@uipilot/*`. CLI: `uipilotCLI`.

## Quick links

- Pack cookbook: `docs/PACK_COOKBOOK.md`
- Architecture: `ARCHITECTURE.md`
- Contributing: `CONTRIBUTING.md`
- Security: `SECURITY.md`

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
