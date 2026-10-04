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

## What packs are optimized for (13 work types)

A product pack teaches NotLM *how your SPA talks*. Core + the generic English base
(`packs/_base-en`, heuristics, typed catalogs) are tuned so ordinary chat covers
these **thirteen jobs** — not open-ended chat. Host packs fill in the product words;
the runtime already knows the shapes.

| # | Type | Plain English |
|---|------|----------------|
| 1 | **FAQ** | Answer “what is… / how do I…” from packed Q&A (plus shared greetings from `_base-en`). |
| 2 | **Goto** | Take the user to a screen or step (“open billing”, “take me to settings”). |
| 3 | **Query** | Read live facts the host can resolve (“what’s next?”, “am I subscribed?”). |
| 4 | **Mutation** | Start a change safely — open a form or preview a write; don’t silently mutate. |
| 5 | **High-risk mutation** | Same idea, but require a clear confirm before anything irreversible. |
| 6 | **Context** | Explain blockers on the current page (“why can’t I save?”, “what’s missing?”). |
| 7 | **Tour** | Walk through a short guided sequence (onboarding, “show me around”). |
| 8 | **Search** | Open the right find/lookup surface (“find contacts”, “search invoices”). |
| 9 | **Compare** | Explain A vs B when the pack has product distinctions. |
| 10 | **Handoff** | Draft a short summary for another person or the desk (when the host enables it). |
| 11 | **Audit** | Replay the last coach action in plain language (“what did you just open?”). |
| 12 | **OOD** | Refuse off-product asks cleanly instead of hallucinating or navigating randomly. |
| 13 | **Disambiguation** | When several steps match, ask which one — or honor “the other one” / cancel / go back. |

Authoring map (where the words live): FAQ → `faq.json`; goto/tour steps → flow +
aliases; query/mutation/tour/search → capability catalogs; compare/context/audit/
handoff/OOD phrasing → heuristics (+ optional FAQ); disambiguation → colliding
aliases + choice chips at runtime. Details: [`docs/PACK_COOKBOOK.md`](docs/PACK_COOKBOOK.md).

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
