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
4. Mapper **drafts control inventories and pack stubs**; process/flow authoring is **hybrid** (jobs input + optional record mode + human/agent refinement).
5. Feature-flag **chat** and **palette** (and spotlight/voice) independently on the Host.
6. Engineering follows `typescript-slice-master.mdc` micro-slices + docs of record.

## Consequences

- VB domain (format compiler, SA-only graph, billing, participant bowling lexicon) becomes a **pack/plugin**, not core.
- Success requires a second pack (`demo-todo`) before claiming portability.
- Fully automatic “scan repo → finished coach” is explicitly **not** promised in v1.
