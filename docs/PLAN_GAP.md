# PLAN_GAP — Epic ledger

Open decisions and epics. Slice ids live in `SLICE_BACKLOG.md`. Update status here when an epic completes or splits.

| Epic | Title | Status | Notes |
|------|-------|--------|-------|
| `boot*` | Repo bootstrap, CI stubs, package skeletons | **mostly done** | P0 — lockfile via npm; pnpm optional |
| `core*` | Portable core: types, flow, slots, parse, dispatch | planned | Trimmed from VB director-guide lessons |
| `react*` | React Host adapter: Provider, FAB, palette, spotlight, voice | planned | Feature flags |
| `schema*` | Pack JSON Schema + Ajv validation for `.workflow-assistant/` | planned | Config-only (ADR-002) |
| `pack-template*` | `_template` + `demo-todo` as folder JSON shape | planned | Mirror host layout |
| `mapper*` | Playwright DOM/a11y inventory → `inventory.json` | planned | Writes WA home only |
| `extract*` | Static `wa dag generate` → structured-draft + checklist | planned | JSON only |
| `author*` | Build-time LLM → drafts + **intent tune from scenarios** | planned | **v1**; never runtime; JSON only |
| `ui-action*` | Enforce UI-actions-only invariant in runtime + e2e | planned | ADR-003 |
| `codegen*` | **Deprecated for TS emit** — checklist/annotation JSON only | planned | No `guideIds.ts` in v1 |
| `process*` | Jobs authoring + record-mode traces under `traces/` | planned | Hybrid |
| `corpus*` | Corpus runner over `pack/corpus.json` | planned | Mandatory gate |
| `vb-pack*` | Victory Bowling reference pack extraction | later | Optional; do not block core |
| `publish*` | npm package names, versioning, changelog | later | After demo-todo green |
| `ci*` | ci_check parity, coverage floors, size gates | planned | Parallel to features |

## Open product decisions (need ADR when chosen)

1. **Package name scope:** `@workflow-assistant/*` vs `@nimbus/assistant-*` — default `@workflow-assistant/*`.
2. **Guide id attribute:** configurable; default `data-guide-id` in `config.json`.
3. **RuntimeContext shape:** host `getContext()` fills `data`; binders JSON reference `data.*` paths.
4. **Mapper auth:** playwright `storageState` — defer to mapper epic ADR.
5. **Build-time LLM:** **Accepted ADR-001**.
6. **Host folder + JSON-only learnings:** **Accepted ADR-002** (`.workflow-assistant/`).
7. **Binder DSL richness:** path/op/value + all/any first; extend only via schema ADR if needed.
8. **Default author model:** leave unset (user chooses).
