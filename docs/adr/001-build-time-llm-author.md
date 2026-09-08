# ADR-001 — Build-time LLM pack authoring (not runtime)

## Status

Accepted

## Context

Mechanical extractors (Playwright inventory, static route/form parse) draft controls and weak DAGs but miss product meaning. LLMs can help *author* packs the way a human reading FE+BE would — but putting LLMs on the runtime intent path breaks corpus gates and determinism.

Users want v1 support for **any credentials they bring**, including **Ollama** and other self-hosted OpenAI-compatible servers.

## Decision

1. **Runtime** (`core`, `react` Host): deterministic NLU only; **no LLM client dependency**.
2. **Build-time** package `@uipilot/author` (CLI): optional LLM drafts pack JSON from inventory + structured extract + redacted source excerpts.
3. **Intent tuning (v1):** users author `scenarios.json` (utterance → expected step/meta/slots). Optional `uipilotCLI intents tune` uses the same BYO/Ollama providers to propose `intents.json` / `corpus.json` updates. Acceptance requires deterministic corpus/`uipilotCLI intents check` green.
4. Providers: **Ollama**, **OpenAI-compatible HTTP** (OpenAI, Azure compat, Groq, Together, LM Studio, vLLM, LocalAI, etc.) via `baseUrl` + `apiKey?` + `model`.
5. Credentials only from env / local user config; never committed; never logged.
6. LLM output is always a **draft** under schema validation + checklist; accepting into a pack requires explicit merge / validate / corpus.
7. Default unit CI uses **fixtures/mocks** for author HTTP — live LLM is optional integration. Scenario checks are **deterministic** and belong in default CI.

## Consequences

- PLAN gains G5b; NG3 clarified as runtime-only ban.
- New epic `author*` / slices in SLICE_BACKLOG.
- SECURITY.md must cover prompt redaction and BYO key handling.
- Cursor master rules: forbid LLM in runtime dispatch; allow author package.
- Extended by **ADR-005** (scenario saturation + orthogonality) — still build-time only.
