# NotLM

**UI, but for you** — a plug-and-play **SPA chatbot frontline**: deterministic pack
NLU as a **smart cache**, optional **Laya** miss fallback, optional **LLM** backup,
plus chat FAB / command palette. **Coaching** (`data-guide-id` spotlight, step tours)
is one pack-driven pattern — not the product identity.

This repo is the **runtime**: `@notlm/core`, `@notlm/react`, `@notlm/schema`,
`@notlm/ranker` (infer), and a thin `notlmCLI` (`init` / `validate` /
`intents check` / `ranker check`). Pack JSON and optional prebuilt ranker artifacts
are host-owned inputs.

```text
User utterance
  → pack smart cache (intents / FAQ / catalogs / discourse)
  → on miss: Laya (/decide)
  → on miss: optional host LLM (/notlm/fallback)
  → reply + optional UI actions (navigate / spotlight / tour)
```

See `ARCHITECTURE.md` for bundle boundaries and [`docs/PACK_COOKBOOK.md`](docs/PACK_COOKBOOK.md) for host wire-up.

## Status

Implementation in progress (not published). Package scope: `@notlm/*`. CLI: `notlmCLI`.

## Quick links

- Pack cookbook: `docs/PACK_COOKBOOK.md`
- Architecture: `ARCHITECTURE.md`
- Contributing: `CONTRIBUTING.md`
- Security: `SECURITY.md`

## Consumer sketch (target API)

```tsx
import { NotLMProvider, NotLMHost } from '@notlm/react';

<NotLMProvider
  pack={pack}
  getContext={getContext}
  navigate={navigate}
  features={{ chat: true, palette: true, spotlight: true, voice: true }}
>
  <App />
  <NotLMHost />
</NotLMProvider>
```
