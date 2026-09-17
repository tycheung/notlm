# ADR-009: Sealed runtime + host BYO LLM fallback

**Status:** Accepted (amended)  
**Date:** 2026-09-17 (amended 2026-09-17)

## Context

UiPilot’s operating packages (`@uipilot/core`, `@uipilot/react`) must stay lean and
deterministic on the chat hot path. Authoring, saturation, ranker training, and
multi-provider LLM SDKs inflate that surface. We also need a **backup LLM** when
local NLU misses, without making the browser call provider APIs.

## Decision

1. **This repo (`uipilot`) is sealed:** runtime only — `@uipilot/core`, `@uipilot/react`,
   `@uipilot/schema`, `@uipilot/ranker` (infer), and a **thin** CLI:
   `init` / `validate` / `intents check` / `ranker check`.
2. **Offline pack improvement is out of scope here.** External tooling may produce
   drafts and artifacts; this repo does not name, ship, or advertise that tooling.
3. **Runtime LLM:** only via host-provided `fallbackLlm` (BYO proxy). Browser never
   holds provider keys. Operating runtime ships **zero** provider SDKs; hosts
   implement their own server proxy (e.g. VB `/uipilot/fallback`).
4. **Promotion (1A):** hosts may log `MissExchange` over the portable HTTP contract;
   pack growth stays draft → human review → `intents check` → accept. No silent
   auto-merge in the runtime.
5. **Operating CLI** does not implement authoring / miss-recalibration verbs
   (unknown / not available).

## Consequences

- Pack mutation stays offline and gated by host process.
- Hosts implement `/uipilot/fallback` + portable miss/exchange APIs without depending
  on provider SDKs in the browser bundle.
- Operating CI remains runnable with gate commands only.
- User-facing docs in this repo describe **pack contracts and host wire-up**, not
  external CLI product names.
