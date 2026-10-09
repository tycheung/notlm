# NotLM

A chatbot frontline for your web app that feels like an AI assistant (plain language, answers, navigate to the right screen) without sending every message to a large language model.

Most in-product asks are predictable ("open billing", "what's this?", "why can't I save?"). NotLM handles that bulk with a local **smart cache**: packaged intents, FAQs, and catalogs that run in the browser (or at the edge of your stack). You keep the conversational UX, cut LLM cost, and get faster replies on the common path. When something novel slips through, an optional smaller model (**Laya**) and then an optional full LLM can still help.

Coaching tours and UI spotlights (`data-guide-id`) are one pack-driven pattern, not the whole product. The point is a frontline that understands *your* app.

**Repo:** [github.com/tycheung/notlm](https://github.com/tycheung/notlm)  
**Offline training / pack growth:** sibling offline-authoring repo (never ships in the SPA bundle)

---

## What it handles well (13 work types)

Packs teach NotLM your product's vocabulary. The runtime already knows these **thirteen jobs**; you fill in the words. This is product chat, not open-ended general AI.

| # | Type | In plain English |
|---|------|------------------|
| 1 | **FAQ** | Answers "what is… / how do I…" from packed Q&A (plus shared greetings). |
| 2 | **Goto** | Takes the user to a screen or step ("open billing", "take me to settings"). |
| 3 | **Query** | Reads live facts your app can resolve ("what's next?", "am I subscribed?"). |
| 4 | **Mutation** | Starts a change safely: opens a form or previews a write; does not silently mutate. |
| 5 | **High-risk mutation** | Same idea, but requires a clear confirm before anything irreversible. |
| 6 | **Context** | Explains blockers on the current page ("why can't I save?", "what's missing?"). |
| 7 | **Tour** | Walks through a short guided sequence (onboarding, "show me around"). |
| 8 | **Search** | Opens the right find/lookup surface ("find contacts", "search invoices"). |
| 9 | **Compare** | Explains A vs B when your pack defines the distinction. |
| 10 | **Handoff** | Drafts a short summary for another person or the desk (when enabled). |
| 11 | **Audit** | Replays the last assistant action in plain language ("what did you just open?"). |
| 12 | **OOD** | Refuses off-product asks cleanly instead of guessing or navigating randomly. |
| 13 | **Disambiguation** | When several steps match, asks which one, or honors "the other one" / cancel / go back. |

Where the words live: FAQ → `faq.json`; goto/tour → flow + aliases; query/mutation/tour/search → capability catalogs; compare/context/audit/handoff/OOD → heuristics (+ optional FAQ); disambiguation → colliding aliases + choice chips. See [`docs/PACK_COOKBOOK.md`](docs/PACK_COOKBOOK.md).

---

## How it works (for builders)

```text
User utterance
  → pack smart cache (intents / FAQ / catalogs / discourse)   ← most traffic
  → on miss: Laya (/decide)
  → on miss: optional host LLM (/notlm/fallback)
  → reply + optional UI actions (navigate / spotlight / tour)
```

This repo is the **runtime**: `@notlm/core`, `@notlm/react`, `@notlm/schema`, `@notlm/ranker` (infer), and `notlmCLI` (`init` / `validate` / `intents check` / `ranker check`). Pack JSON and optional ranker artifacts are **host-owned**.

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

`NotLMHost` already wraps `NotLMProvider` and mounts FAB/palette/checklist. Do not nest both.

---

## Status (1.0.0 release line)

Packages are versioned **`1.0.0`**. Live `npm publish` for the `@notlm` scope is gated on org auth + human approval. See [`docs/PUBLISH_GATE.md`](docs/PUBLISH_GATE.md).

| Doc | |
|-----|--|
| Pack cookbook | [`docs/PACK_COOKBOOK.md`](docs/PACK_COOKBOOK.md) |
| React host guide | [`docs/REACT_GUIDE.md`](docs/REACT_GUIDE.md) |
| Core API tiers | [`docs/CORE_API_TIERS.md`](docs/CORE_API_TIERS.md) |
| Publish gate | [`docs/PUBLISH_GATE.md`](docs/PUBLISH_GATE.md) |
| Architecture | [`ARCHITECTURE.md`](ARCHITECTURE.md) |
| Contributing | [`CONTRIBUTING.md`](CONTRIBUTING.md) |
| Security | [`SECURITY.md`](SECURITY.md) |

## Develop

```bash
npm install
npm run build
npm test
```

Demo hosts under `apps/`; example packs under `packs/`.
