# ADR-009: Runtime vs training repos + host BYO LLM fallback

**Status:** Accepted  
**Date:** 2026-09-17

## Context

UiPilot’s operating packages (`@uipilot/core`, `@uipilot/react`) must stay lean and
deterministic on the chat hot path. Authoring (saturation, intents tune, ranker train)
and multi-provider LLM SDKs inflate that surface. We also need a **backup LLM** when
local NLU misses, without making the browser call provider APIs.

## Decision

1. **Operating repo (`uipilot`):** runtime + schema + `@uipilot/llm` (server/training
   adapters only) + optional thin validate/misses CLI.
2. **Training repo (`uipilot-training`):** MissExchange recalibration CLI
   (`exchanges pull|draft`, `metrics`). Map/tune/prepare remain in operating
   `uipilotCLI` until packages are physically relocated; training is the home for
   exchange→draft loops and hit-rate metrics.
3. **Runtime LLM:** only via host-provided `fallbackLlm` (BYO proxy). Browser never
   holds provider keys. Providers: ollama, openai, openai-compat, anthropic, huggingface.
4. **Promotion (1A):** log `MissExchange`; training writes **drafts only**; human /
   `intents check` accept before pack ownership. No silent auto-merge.

## Consequences

- Pack mutation stays offline and gated.
- Hosts (e.g. Victory Bowling) implement `/uipilot/fallback` + portable miss/exchange APIs.
- Gradual local takeover is measured as falling `fallbackShare` after accepts.
