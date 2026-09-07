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
2. `core-006`… intent parse + dispatch (or `core-001` doc pass if types need ADR)
3. `react-001` Provider + feature flags
4. Keep `mapper-*` after demo-todo corpus exists

## Notes

- Prefer `typescript-slice-master.mdc` as the constitution for this repo.
- Mapper thesis documented in PLAN §5: inventory ≠ process DAG.
- Voice policy: Web Speech; Chrome/Edge/Safari; Firefox type-only; no Whisper.
