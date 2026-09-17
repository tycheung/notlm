# UiPilot

**UI, but for you** — pilot the UI with a plug-and-play coach for SPAs: deterministic
**runtime** NLU, `data-guide-id` coaching, optional **chat FAB** + **command palette**.

This repo is the **runtime**: `@uipilot/core`, `@uipilot/react`, `@uipilot/schema`,
`@uipilot/ranker` (infer), and a thin `uipilotCLI` (`init` / `validate` /
`intents check` / `ranker check`). Pack JSON and optional prebuilt ranker artifacts
are host-owned inputs.

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
