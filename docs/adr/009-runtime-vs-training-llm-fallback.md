# ADR-009: Sealed runtime + host BYO LLM fallback

**Status:** Accepted  
**Date:** 2026-09-17

## Context

NotLM’s operating packages (`@notlm/core`, `@notlm/react`, `@notlm/schema`,
`@notlm/ranker`, `@notlm/cli`, `@notlm/ops`) must stay lean and deterministic on
the chat hot path. Authoring, saturation, ranker training, and multi-provider
LLM SDKs inflate that surface. Hosts still need a **backup LLM** when local NLU
misses, without making the browser call provider APIs.

## Decision

1. **This repo (`notlm`) is sealed:** runtime only — `@notlm/core`, `@notlm/react`,
   `@notlm/schema`, `@notlm/ranker` (infer), `@notlm/ops` (install templates), and a
   **thin** CLI: `init` / `validate` / `intents check` / `ranker check` /
   `laya install` / `celery install`.
2. **Offline pack improvement is out of scope here.** External tooling may produce
   drafts and artifacts; this repo does not name, ship, or advertise that tooling.
3. **Runtime LLM:** only via host-provided `fallbackLlm` (BYO proxy). Browser never
   holds provider keys. Operating runtime ships **zero** provider SDKs; hosts
   implement their own server proxy (typically `POST /notlm/fallback`).
4. **Promotion:** hosts may log `MissExchange` over the portable HTTP contract;
   pack growth stays draft → human review → `intents check` → accept. No silent
   auto-merge in the runtime.
5. **Operating CLI** does not implement authoring / miss-recalibration verbs
   (unknown / not available).

## Consequences

- Pack mutation stays offline and gated by host process.
- Hosts implement `/notlm/fallback` + portable miss/exchange APIs without depending
  on provider SDKs in the browser bundle.
- Operating CI remains runnable with gate commands only.
- User-facing docs in this repo describe **pack contracts and host wire-up**, not
  external CLI product names.
