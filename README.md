# NotLM

NotLM is a chatbot for your web app that *feels* like talking to an AI assistant —
ask in plain language, get answers, get taken to the right screen — without sending
every message to a large language model.

Most of what people actually say in a product (“open billing”, “what’s this?”,
“why can’t I save?”) is predictable. NotLM captures that bulk of traffic with a
local **smart cache**: packaged intents, FAQs, and catalogs that run in the browser
(or at the edge of your stack). You keep the conversational experience, cut LLM
cost, and get snappier replies (no round-trip for the common path). When something
truly novel slips through, an optional smaller model (**Laya**) and then an optional
full LLM can still help — so the chat stays useful without paying LLM rates for
every “take me to settings.”

Coaching tours and UI spotlights (`data-guide-id`) are one pattern you can pack —
not the whole product. The point is a frontline that understands *your* app.

---

## What it handles well (13 work types)

Packs teach NotLM your product’s vocabulary. The runtime already knows these
**thirteen jobs**; you fill in the words. This is product chat, not open-ended
general AI.

| # | Type | In plain English |
|---|------|------------------|
| 1 | **FAQ** | Answers “what is… / how do I…” from packed Q&A (plus shared greetings). |
| 2 | **Goto** | Takes the user to a screen or step (“open billing”, “take me to settings”). |
| 3 | **Query** | Reads live facts your app can resolve (“what’s next?”, “am I subscribed?”). |
| 4 | **Mutation** | Starts a change safely — opens a form or previews a write; doesn’t silently mutate. |
| 5 | **High-risk mutation** | Same idea, but requires a clear confirm before anything irreversible. |
| 6 | **Context** | Explains blockers on the current page (“why can’t I save?”, “what’s missing?”). |
| 7 | **Tour** | Walks through a short guided sequence (onboarding, “show me around”). |
| 8 | **Search** | Opens the right find/lookup surface (“find contacts”, “search invoices”). |
| 9 | **Compare** | Explains A vs B when your pack defines the distinction. |
| 10 | **Handoff** | Drafts a short summary for another person or the desk (when enabled). |
| 11 | **Audit** | Replays the last assistant action in plain language (“what did you just open?”). |
| 12 | **OOD** | Refuses off-product asks cleanly instead of guessing or navigating randomly. |
| 13 | **Disambiguation** | When several steps match, asks which one — or honors “the other one” / cancel / go back. |

Where the words live: FAQ → `faq.json`; goto/tour → flow + aliases;
query/mutation/tour/search → capability catalogs; compare/context/audit/handoff/OOD
→ heuristics (+ optional FAQ); disambiguation → colliding aliases + choice chips.
See [`docs/PACK_COOKBOOK.md`](docs/PACK_COOKBOOK.md).

---

## How it works (for builders)

```text
User utterance
  → pack smart cache (intents / FAQ / catalogs / discourse)   ← most traffic
  → on miss: Laya (/decide)
  → on miss: optional host LLM (/notlm/fallback)
  → reply + optional UI actions (navigate / spotlight / tour)
```

This repo is the **runtime**: `@notlm/core`, `@notlm/react`, `@notlm/schema`,
`@notlm/ranker` (infer), and `notlmCLI` (`init` / `validate` / `intents check` /
`ranker check`). Pack JSON and optional ranker artifacts are **host-owned**.

```tsx
import { NotLMHost, NOTLM_CSS } from '@notlm/react';

// Inject chrome CSS once (or import tokens via @notlm/react/styles).
if (typeof document !== 'undefined' && !document.getElementById('notlm-css')) {
  const el = document.createElement('style');
  el.id = 'notlm-css';
  el.textContent = NOTLM_CSS;
  document.head.appendChild(el);
}

<NotLMHost
  pack={pack}
  getContext={getContext}
  navigate={navigate}
  features={{ chat: true, palette: true, spotlight: true, voice: true }}
>
  <App />
</NotLMHost>
```

`NotLMHost` already wraps `NotLMProvider` and mounts FAB/palette/checklist — do not nest both.

**Status:** packages at `0.1.0`; live npm publish is gated. CLI: `notlmCLI`.

| Doc | |
|-----|--|
| Pack cookbook | [`docs/PACK_COOKBOOK.md`](docs/PACK_COOKBOOK.md) |
| React host guide | [`docs/REACT_GUIDE.md`](docs/REACT_GUIDE.md) |
| Core API tiers | [`docs/CORE_API_TIERS.md`](docs/CORE_API_TIERS.md) |
| Publish gate | [`docs/PUBLISH_GATE.md`](docs/PUBLISH_GATE.md) |
| Architecture | [`ARCHITECTURE.md`](ARCHITECTURE.md) |
| Contributing | [`CONTRIBUTING.md`](CONTRIBUTING.md) |
| Security | [`SECURITY.md`](SECURITY.md) |
