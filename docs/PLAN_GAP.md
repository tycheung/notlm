# PLAN_GAP — Epic ledger

Open decisions and epics. Slice ids live in `SLICE_BACKLOG.md`. Update status here when an epic completes or splits.

| Epic | Title | Status | Notes |
|------|-------|--------|-------|
| `boot*` | Repo bootstrap, CI stubs, package skeletons | **mostly done** | P0 — lockfile via npm; pnpm optional |
| `core*` | Portable core: types, flow, slots, parse, dispatch | planned | Trimmed from VB director-guide lessons |
| `react*` | React Host adapter: Provider, FAB, palette, spotlight, voice | planned | Feature flags |
| `schema*` | Pack JSON Schema + Ajv validation | planned | |
| `pack-template*` | `_template` + `demo-todo` packs | planned | Proves portability |
| `mapper*` | Playwright DOM/a11y inventory → ControlInventory | planned | Not full process inference |
| `extract*` | Static `wa dag generate` structured draft + checklist | planned | Routes/forms/guide-ids/notify hooks |
| `author*` | Build-time LLM pack writing (BYO / Ollama / OpenAI-compat) | planned | **v1**; never in runtime |
| `codegen*` | Pack → TS emit + annotation checklist | planned | |
| `process*` | Jobs authoring + record-mode step drafts | planned | Hybrid human/agent |
| `corpus*` | Corpus runner + seed generators from aliases | planned | Mandatory gate |
| `vb-pack*` | Victory Bowling reference pack extraction | later | Optional; do not block core |
| `publish*` | npm package names, versioning, changelog | later | After demo-todo green |
| `ci*` | ci_check parity, coverage floors, size gates | planned | Parallel to features |

## Open product decisions (need ADR when chosen)

1. **Package name scope:** `@workflow-assistant/*` vs `@nimbus/assistant-*` vs scoped under Victory org — default working name `@workflow-assistant/*` until a naming ADR.
2. **Guide id attribute:** stick with `data-guide-id` for VB parity vs configurable attribute name (prefer configurable defaulting to `data-guide-id`).
3. **RuntimeContext shape:** pack-extends core base vs fully pack-defined zod/json-schema context — lean pack-defined fields + core-required `pathname` / `layoutPrefix?`.
4. **Mapper auth:** how crawlers log into host apps (playwright storageState) — defer to mapper epic ADR.
5. **Build-time LLM:** **Accepted in ADR-001** — BYO + Ollama + OpenAI-compatible; runtime forbidden.
6. **Default author model:** leave unset (user chooses); document recommended small local models for Ollama in CONTRIBUTING later.
