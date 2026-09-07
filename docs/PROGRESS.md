# PROGRESS

## Current

- **Slice:** `boot-001` — Workspace builds empty packages (**done** enough to typecheck/test)
- **Also landed with bootstrap:** planning docs, ADR-000, trimmed core starter (types, fuzzy, flowGraph, slots, flowStatus), react speech/flash stubs, mapper types, demo-todo pack draft

## Last completed

- `boot-001` (+ planning + core starter extract)
- Docs: PLAN, PLAN_GAP, SLICE_BACKLOG, PROGRESS, ARCHITECTURE, CONTRIBUTING, SECURITY, tests/README, ADR-000
- Packages: core / react / schema / mapper / codegen + apps/demo + packs

## Blockers

- None. Prefer pnpm when available; npm workspaces verified locally.

## Next

1. `boot-002` — harden CI script / coverage config (optional polish)
2. `core-006`… intent parse + dispatch (or continue core extract)
3. `react-001` Provider + feature flags
4. After demo-todo: `extract-*` then `author-*` (build-time LLM; ADR-001)
5. Keep `mapper-*` / `author-*` out of runtime package dependency graphs

## Notes

- Prefer `typescript-slice-master.mdc` as the constitution for this repo.
- **ADR-003:** UI-actions only — always press/simulate real controls; never call host product APIs from the coach.
- **ADR-001:** BYO / Ollama / OpenAI-compatible for pack author **and** `intents tune` from `scenarios.json`; never in runtime NLU.
- **ADR-002:** all host learnings/config in `.workflow-assistant/` as JSON only (no generated TS pack code).
- Mapper thesis: inventory ≠ process DAG; structured extract + checklist + optional LLM author (build-time).
- Voice policy: Web Speech; Chrome/Edge/Safari; Firefox type-only; no Whisper.
