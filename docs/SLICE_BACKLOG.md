# SLICE_BACKLOG

Ordered micro-slices. Budget: **≤3 production files / ≤120 net LOC** unless split.  
Status: `open` | `doing` | `done` | `blocked` | `deferred`.

---

## P0 — Bootstrap

| ID | Title | Status | Target paths (hint) | Acceptance |
|----|-------|--------|---------------------|------------|
| `boot-001` | Workspace builds empty packages | **done** | `package.json`, workspaces, `tsconfig*.json`, `packages/*/package.json` | `npm install` + `npm run typecheck` + `npm test` succeed |
| `boot-002` | Vitest + ESLint stubs wired | **done** | `vitest.config.ts`, `eslint.config.js`, `scripts/ci/ci_check.mjs` | `pnpm test` / `npm test` + lint entrypoints exist |
| `boot-003` | Import-graph / module-size test stubs | **done** | `tests/unit/architecture.test.ts` | Minimal asserts present |
| `boot-004` | ADR-000 north star committed | **done** | `docs/adr/000-north-star.md` | ADR exists; linked from PLAN |

---

## P1 — Core (generic)

| ID | Title | Status | Acceptance |
|----|-------|--------|------------|
| `core-001` | Core types: StepId string brand, FlowStepDef, RuntimeContext base, ChatMessage, ParseResult | **done** | Types export; compile |
| `core-002` | `editDistance` / fuzzy helpers | **done** | Unit tests for distance |
| `core-003` | Flow graph helpers: `dependentStepIds`, validate DAG acyclic requires | **done** | Unit: cycle rejected; dependents correct |
| `core-004` | Session slots: patch, queue, stale, goBack (generic step ids) | **done** | Unit matrix for queue advance / stale |
| `core-005` | `evaluateFlowStatuses` engine taking pack predicates | **done** | Unit: requires gate availability |
| `core-006` | Intent parse skeleton: aliases, meta patterns, phraseScore | **done** | Corpus / unit cases green |
| `core-007` | `parsePackedUtterance` boundary split | **done** | Unit: two-step pack |
| `core-008` | `dispatchUserUtterance` order (disambiguation → pack → meta → single) | **done** | Unit: order locks; no product domain |
| `core-009` | Nav-skip types + `searchNavSkips` | **done** | Unit: hideWhen + query filter |
| `core-010` | Page-context bias helpers | **done** | Unit: route → step bias |
| `core-011` | Generic `shouldSkipLaunchSpotlight` (path + openModal hooks) | **done** | Covered via pageContext helpers |
| `core-012` | Core public barrel `index.ts` + facade test | **done** | Exports intentional; loadPack + loadFolder |

---

## P2 — React Host adapter

| ID | Title | Status | Acceptance |
|----|-------|--------|------------|
| `react-001` | Provider: pack + getContext + navigate + features flags | **done** | Renders children; context accessible |
| `react-002` | Spotlight overlay + DOM poll controller | **done** | Finds `[data-guide-id]`; Escape dismiss |
| `react-003` | Field flash helper (generic class name) | **done** | Adds/removes flash class |
| `react-004` | Command palette UI (search + availability) | **done** | Host composite / flags |
| `react-005` | Chat FAB (typed submit → dispatch) | **done** | Chat-only; no checklist panel |
| `react-006` | Web Speech hook + degrade copy | **done** | Unsupported → type instead; no Whisper |
| `react-007` | `useGuideModal` + pendingModal bridge | **done** | Host can open modal by key |
| `react-008` | Host composite `<UiPilotHost />` | **done** | Respects feature flags |
| `react-009` | Playwright smoke: FAB open + typed utterance (demo) | **done** | `@guide-nlu` tag green |

---

## P3 — Schema + packs (JSON folder format)

| ID | Title | Status | Acceptance |
|----|-------|--------|------------|
| `schema-001` | JSON Schema for `.uipilot/pack/*` + config | **done** | Ajv validates template |
| `schema-002` | Binder DSL schema (path/op/value, all/any) | **done** | Unit eval fixtures |
| `schema-003` | Loader: folder → runtime PackRuntime | **done** | `loadUipilotHomeFromDir` round-trip (Node) |
| `pack-001` | `uipilotCLI init` creates `.uipilot/` stub tree | **done** | Files match ADR-002 |
| `pack-002` | `demo-todo` as folder JSON under packs/ or fixture UiPilot home | **done** | Corpus / scenarios green |
| `pack-003` | demo-todo binders.json + nav in controls.json | **done** | Status eval unit green |
| `corpus-001` | Corpus runner reads `pack/corpus.json` | **done** | `uipilotCLI intents check` / scenarios gate |

---

## P4 — Mapper (DOM inventory)

| ID | Title | Status | Acceptance |
|----|-------|--------|------------|
| `mapper-001` | Types: ControlInventory, InventoriedControl | **done** | Types only + doc |
| `mapper-002` | Playwright crawler: collect interactive a11y nodes | **done** | Optional peer + `crawlHtml` fixture path |
| `mapper-003` | Propose `data-guide-id` slugs from role+name | **done** | Stable slug unit tests |
| `mapper-004` | CLI crawl writes `.uipilot/inventory.json` | **done** | Path from config |
| `mapper-005` | Merge existing `data-guide-id` without overwrite | **done** | Unit merge |
| `mapper-006` | Update `pack/controls.json` draft + checklist entries | **done** | Via `uipilotCLI dag generate`; schema-valid; no TS emit |

---

## P4b — Structured extractor + checklist

| ID | Title | Status | Acceptance |
|----|-------|--------|------------|
| `extract-001` | Types: StructuredDraft, ChecklistItem, confidence | **done** | Types + checklist JSON in UiPilot home |
| `extract-002` | Static scan: React Router / route tables → screen nodes | **done** | Fixture repo snapshot |
| `extract-003` | Static scan: forms + submit handlers → write candidates | **done** | Fixture snapshot |
| `extract-004` | Static scan: `data-guide-id` + `notifyStepCompleted` calls | **done** | `scanGuideIdsInDir` + inventory merge (lite) |
| `extract-005` | CLI `uipilotCLI dag generate` → structured-draft.json + checklist.json in UiPilot home | **done** | Gaps listed for binders |
| `extract-006` | Never invent requires without `confidence: low` mark | **done** | Unit policy test |

---

## P4c — Build-time LLM author (v1)

| ID | Title | Status | Acceptance |
|----|-------|--------|------------|
| `author-001` | Package `@uipilot/author` scaffold (no runtime dep from core) | **done** | core package.json has no author/llm dep |
| `author-002` | Provider interface: `completeChat({ messages })` | **done** | Unit with mock |
| `author-003` | Ollama adapter (`/api/chat` or OpenAI-compat mode) | **done** | Fixture HTTP |
| `author-004` | OpenAI-compatible adapter (baseUrl + apiKey + model) | **done** | Fixture HTTP |
| `author-005` | Env/config loader (`UIPILOT_LLM_*`); refuse to read committed secrets files | **done** | Unit |
| `author-006` | Prompt builder: inventory + structured draft + redacted excerpts | **done** | Redaction unit tests |
| `author-007` | Parse model JSON → pack draft; schema validate | **done** | Invalid JSON → checklist error |
| `author-008` | CLI `uipilotCLI pack author` writes `drafts/<id>/` + updates checklist | **done** | Under UiPilot home only |
| `author-009` | `--accept` merges draft JSON into `pack/` (no TS) | **done** | `uipilotCLI pack accept` |
| `author-010` | Integration doc: Ollama + one cloud BYO example | **done** | SECURITY + CONTRIBUTING |
| `author-011` | Schema for `scenarios.json` (utterance → expect) | **done** | Ajv + fixture |
| `author-012` | `uipilotCLI intents check` — run scenarios against pack (no LLM) | **done** | Non-zero exit on fail; CI-ready |
| `author-013` | `uipilotCLI intents tune` — LLM proposes intents/corpus from scenarios | **done** | Writes drafts/ only |
| `author-014` | Merge tuned intents/corpus with `--accept`; re-run check | **done** | Accept path + check |
| `author-015` | Support negative scenarios (`expect: { stepId: null }`) | **done** | Unit / intents check |

---

## P4d — Scenario saturation & orthogonality (G5d / ADR-005)

Build-time only. Generate diverse candidate prompts in batches of tens→hundreds,
score incremental novelty vs the prior pool, stop on plateau, then mine intent /
DAG borders via `intents check` + Playwright `@guide-saturate`. Pack fixes stay
draft → validate → `--accept`.

| ID | Title | Status | Target paths (hint) | Acceptance |
|----|-------|--------|---------------------|------------|
| `sat-001` | ADR-005 scenario saturation + orthogonality | **done** | `docs/adr/005-scenario-saturation-orthogonality.md` | ADR committed; linked from PLAN G5d |
| `sat-002` | Types: ScenarioCandidate, NoveltyReport, plateau config | **done** | `packages/author/src/saturation/types.ts` | Types export; compile |
| `sat-003` | Lexical novelty (char/word n-gram Jaccard → nearest prior) | **done** | `packages/author/src/saturation/lexicalNovelty.ts` | Unit matrix: paraphrase low; distinct high |
| `sat-004` | Parse-signature novelty from deterministic parse outcomes | **done** | `packages/author/src/saturation/parseSignatureNovelty.ts` | Unit: new/rare `stepId`/meta/null/clash buckets score higher |
| `sat-005` | `estimateIncrementalNovelty` + plateau detector (ε, K) | **done** | `packages/author/src/saturation/novelty.ts` | Unit: consecutive low batches → plateau true |
| `sat-006` | LLM prompt: diverse candidates from pack + inventory + draft | **done** | `packages/author/src/saturation/generatePrompt.ts` | Fixture HTTP; redaction; JSON candidates only |
| `sat-007` | CLI `scenarios generate --batch N` → candidates + novelty report | **done** | `packages/cli` + `.uipilot/saturation/` | Writes under UiPilot home; no pack overwrite |
| `sat-008` | CLI `scenarios saturate` loop generate→score→stop on plateau | **done** | `packages/cli` + author saturate | Exit 0 on plateau; report lists batch novelty curve |
| `sat-009` | Soft-label candidates (LLM expect) → draft scenarios only | **done** | `packages/author` + `drafts/` | Never merges pack/ without `--accept` |
| `sat-010` | Failure mining → checklist + intents/corpus/flow draft patches | **done** | author + CLI | Failures produce actionable `drafts/` + checklist items |
| `sat-011` | Playwright `@guide-saturate`: typed FAB over scenario/candidate pool | **done** | `tests/e2e/*saturate*` | Tag runs; typed only; no mic; ADR-003 intact |
| `sat-012` | demo-todo saturation fixture + opt-in CI flag | **done** | `packs/demo-todo`, `scripts/ci` | Default unit CI needs no live LLM; `--with-saturation` documented |
| `sat-013` | CONTRIBUTING: when to stop, how to accept pack fixes | **done** | `CONTRIBUTING.md` | Operator loop documented |
| `sat-014` | No-lift stop: 5×100 passes with no parse-signature lift | **done** | `saturation/types.ts`, `novelty.ts`, `saturateLoop.ts` | Stop even if lexical novelty stays high; unit covers 5×100 |
| `sat-015` | `--force=N` / `--hard=N` hard augment (ignore similarity) | **done** | CLI `tune` / `scenarios generate`/`saturate` | Emits exactly N; no plateau; docs + tests |

---

## P4e — Operator CLI façade (ADR-006)

Primary verbs for over-codebase setup. Compose atomics; do not duplicate LLM logic.

| ID | Title | Status | Target paths (hint) | Acceptance |
|----|-------|--------|---------------------|------------|
| `cli-001` | ADR-006 map / tune / prepare façade | **done** | `docs/adr/006-cli-map-tune-prepare.md` | ADR committed; PLAN CLI section matches |
| `cli-002` | `uipilotCLI map` — mechanical inventory/extract/dag generate | **done** | `packages/cli` | Basic map writes structured-draft + checklist; no LLM |
| `cli-003` | `uipilotCLI map --llm` — map then pack author → drafts/ | **done** | `packages/cli` | Requires LLM env; never auto-accepts pack/ |
| `cli-004` | `uipilotCLI tune` — saturate + intents tune + failure drafts | **done** | `packages/cli` | Depends on sat-* atomics; compose only |
| `cli-005` | `uipilotCLI prepare` — map then tune (`--llm` optional) | **done** | `packages/cli` | Sequential; shared exit codes / summary |
| `cli-006` | CLI help + CONTRIBUTING three-phase operator guide | **done** | `cli.ts`, `CONTRIBUTING.md` | Usage lists primary vs atomic |

---

## P4f — Host chrome personalization (G10 / ADR-007)

Devs import `@uipilot/react`, train via CLI, and brand the chat/FAB without forking dispatch.

| ID | Title | Status | Target paths (hint) | Acceptance |
|----|-------|--------|---------------------|------------|
| `chrome-001` | ADR-007 host chrome personalization | **done** | `docs/adr/007-host-chrome-personalization.md` | ADR committed; linked from PLAN G10 |
| `chrome-002` | Refactor `UIPILOT_CSS` to CSS variables with defaults | **done** | `packages/react/src/uipilot.css.ts` | Accents/surfaces use `var(--uipilot-*)`; visual parity default |
| `chrome-003` | `appearance` + root `className`/`style` on Provider/Host | **done** | `UiPilotContext.tsx`, `UiPilotHost.tsx` | Tokens applied on `.uipilot-host-root`; unit/RTL assert style |
| `chrome-004` | Document stable `uipilot-*` class contract | **done** | `CONTRIBUTING.md` or react README | Class list for chat/FAB/palette/spotlight |
| `chrome-005` | `classNames` partial map for chrome slots | **done** | Fab + palette | Host can append classes per slot |
| `chrome-006` | Slot: `components.FabButton` override | **done** | `UiPilotFab.tsx` | Custom FAB; dispatch unchanged; testid preserved or documented |
| `chrome-007` | Slots: `ChatHeader` + optional `ChatPanel` shell | **done** | `UiPilotFab.tsx` | Custom header/shell; messages/input behavior props typed |
| `chrome-008` | Demo host brand example (tokens + one slot) | **done** | `apps/demo` | Visible non-default accent; coach e2e still green |
| `chrome-009` | Facade export test for appearance/components types | **done** | `packages/react` + architecture/facade test | Public API intentional |

---

## P5b — UI-actions-only enforcement (ADR-003)

| ID | Title | Status | Acceptance |
|----|-------|--------|------------|
| `ui-001` | Document invariant in Provider/executeStep JSDoc | **done** | ADR-003 + host docs |
| `ui-002` | Architecture test: react/core must not import host api paths | **done** | `tests/unit/ui-actions-boundary.test.ts` |
| `ui-003` | Demo e2e creates entity only via button click after coach nav | **done** | No fetch stub as coach write path |

---

## P5 — Annotation assist (not TS codegen)

| ID | Title | Status | Acceptance |
|----|-------|--------|------------|
| `annotate-001` | checklist.json items for missing `data-guide-id` mounts | **done** | Machine-readable list from dag generate |
| `annotate-002` | Optional markdown export of checklist for PRs | **done** | `checklistToMarkdown`; still no src TS emit |
| `annotate-003` | Remove/avoid `guideIds.ts` generation from v1 scope | **done** | PLAN/ADR-002 aligned |

---

## P6 — Process assist

| ID | Title | Status | Acceptance |
|----|-------|--------|------------|
| `process-001` | Jobs YAML input → draft `flow` steps (linear) | **done** | Author supplies job titles |
| `process-002` | Attach inventoried CTA → step via interactive map file | open | Draft nav-skip stubs |
| `process-003` | Record mode: trace clicks → ordered step candidates | **done** | Trace JSON → draft flow |
| `process-004` | Intent seed from step titles + control names | **done** | Alias list generated |
| `process-005` | Corpus seed (clean only) from aliases | **done** | Human expands slang later |
| `process-006` | ADR: limits of automatic process inference | **done** | ADR-004 accepted stub |

---

## P7 — CI maturity

| ID | Title | Status | Acceptance |
|----|-------|--------|------------|
| `ci-001` | `ci_check` mirrors lint+typecheck+test | **done** | Script exits non-zero on fail |
| `ci-002` | Coverage floors core ≥85% / global ≥75% | open | Enforced in CI config |
| `ci-003` | Module size ≤1000 LOC gate | open | Fails on oversized file |
| `ci-004` | Pack schema gate in CI | open | Invalid pack fails CI |

---

## P8 — VB reference (later)

| ID | Title | Status | Acceptance |
|----|-------|--------|------------|
| `vb-001` | Inventory VB guide modules → pack vs core split map | **done** | Extract script + pack under `packs/vb-director` |
| `vb-002` | Extract flow + guide ids + intents into pack draft | **done** | No VB API in core; `npm run extract:vb` |
| `vb-003` | Format compiler as pack plugin interface | open | Core dispatch calls optional plugin |
| `vb-004` | Host adapter notes for VB layouts | open | Integration doc only |

---

## P9 — Publish

| ID | Title | Status | Acceptance |
|----|-------|--------|------------|
| `publish-001` | Package names + LICENSE + README install story | **deferred** | README consumer snippet works |
| `publish-002` | Changesets or manual semver policy ADR | **deferred** | ADR |
| `publish-003` | Dry-run pack publish | **deferred** | `npm pack` artifacts sane |

---

## Refactor slots (insert every 4–6 feature slices)

| ID | Title | Status |
|----|-------|--------|
| `refactor:core-split-dispatch` | Split dispatch modules if >400 LOC | open |
| `refactor:react-trim-fab` | Trim FAB chrome duplication | open |
| `refactor:mapper-extract-a11y` | Extract a11y normalize helpers | open |
