# PLAN_GAP — Epic ledger

Open decisions and epics. Slice ids live in `SLICE_BACKLOG.md`. Update status here when an epic completes or splits.

| Epic | Title | Status | Notes |
|------|-------|--------|-------|
| `boot*` | Repo bootstrap, CI stubs, package skeletons | **done** | P0 |
| `core*` | Portable core: types, flow, slots, parse, dispatch, JSON load | **mostly done** | `loadUipilotHomeFromDir` Node-only |
| `react*` | React Host adapter: Provider, FAB, palette, spotlight, voice | **mostly done** | Playwright coach smoke (`react-009`) open |
| `schema*` | Pack JSON Schema + Ajv validation for `.uipilot/` | **done** | Config-only (ADR-002) |
| `pack-template*` | `_template` + `demo-todo` as folder JSON shape | **done** | + demo-crm |
| `mapper*` | DOM/HTML inventory → `inventory.json` | **mostly done** | crawlHtml + optional Playwright |
| `extract*` | Static scan + `uipilotCLI dag generate` → structured-draft + checklist | **partial** | guide-id scan done; routes/forms open |
| `author*` | Build-time LLM → drafts + **intent tune from scenarios** | **done** | never runtime; JSON only |
| `saturate*` | LLM scenario batches + orthogonality plateau + Playwright border hunt → pack fixes | **done** | ADR-005; fixture + `@guide-saturate` |
| `cli-facade*` | Operator cmds: `map` / `tune` / `prepare` (map then tune) | **done** | ADR-006; composes atomics |
| `chrome*` | Host FAB/chat personalization (tokens, classes, slots) | **done** | ADR-007 / G10 |
| `ui-action*` | Enforce UI-actions-only invariant in runtime + e2e | **done** | boundary test + demo e2e |
| `codegen*` | Checklist/annotation markdown only (no TS emit) | **done** | `checklistToMarkdown` |
| `process*` | Jobs authoring + record-mode traces under `traces/` | planned | Hybrid |
| `corpus*` | Corpus / scenarios runner | **done** | `uipilotCLI intents check` + root `check:*` |
| `vb-pack*` | Victory Bowling reference pack extraction | **mostly done** | sandbox copy + extract script; format plugin open |
| `publish*` | npm package names, versioning, changelog | **deferred** | Explicitly out of current wave |
| `ci*` | ci_check parity, coverage floors, size gates | **partial** | `ci_check` exists; floors open |

## Open product decisions (need ADR when chosen)

1. **Package name scope:** `@uipilot/*` vs `@nimbus/assistant-*` — default `@uipilot/*`.
2. **Guide id attribute:** configurable; default `data-guide-id` in `config.json`.
3. **RuntimeContext shape:** host `getContext()` fills `data`; binders JSON reference `data.*` paths.
4. **Mapper auth:** playwright `storageState` — defer to mapper epic ADR.
5. **Build-time LLM:** **Accepted ADR-001**.
6. **Host folder + JSON-only learnings:** **Accepted ADR-002** (`.uipilot/`).
7. **Binder DSL richness:** path/op/value + all/any first; extend only via schema ADR if needed.
8. **Default author model:** leave unset (user chooses).
9. **Saturation novelty defaults:** ε / K / batch size — propose in ADR-005 implementation slices; document knobs in `config.json`.
10. **Optional embeddings for novelty:** v1 = lexical + parse-signature only; embeddings need a later ADR if BYO embedding API is desired.
11. **CLI façade names:** **Accepted ADR-006** — `map` / `tune` / `prepare` (not `setup` / `onboard` unless aliased later).
12. **Chrome personalization:** **Accepted ADR-007** — CSS variables + `appearance` + optional slots; not pack JSON.
