# ADR-000 — Workflow Assistant north star

## Status

Accepted

## Context

Victory Bowling shipped a Director Guide coach that works: deterministic NLU, `data-guide-id` coaching, chat FAB + command palette, corpus + Playwright gates. We want that **operating system** as a reusable product without baking bowling (or VB APIs) into the runtime.

Teams also want help **generating** packs from existing apps. DOM/Playwright scanning can inventory actions/controls but cannot alone infer job graphs or safe writes.

## Decision

1. Build a **TypeScript monorepo** published as npm packages (`@workflow-assistant/*` working name).
2. Boundaries: **Core** (generic) · **React Host adapter** (generic UI) · **Pack** (per product) · **Mapper/Codegen** (tooling).
3. Runtime NLU remains **deterministic** (aliases/regex/fuzzy). No Whisper. No silent writes. Anchors only.
4. **Build-time** LLM pack authoring is in v1 via a separate author package (see ADR-001): BYO credentials, Ollama, OpenAI-compatible self-host — never on the runtime hot path.
5. **Host learnings are JSON under one folder** (see ADR-002): `.workflow-assistant/` — no generated TypeScript pack registries as the source of truth.
6. Mapper **drafts control inventories and pack stubs**; process/flow authoring is **hybrid** (structured extract + checklist + optional LLM draft + human/CI accept).
7. Feature-flag **chat** and **palette** (and spotlight/voice) independently on the Host.
8. Engineering follows `typescript-slice-master.mdc` micro-slices + docs of record.

## Consequences

- VB domain (format compiler, SA-only graph, billing, participant bowling lexicon) becomes a **pack/plugin**, not core.
- Success requires a second pack (`demo-todo`) before claiming portability.
- Fully automatic “scan repo → finished coach” is explicitly **not** promised in v1.
