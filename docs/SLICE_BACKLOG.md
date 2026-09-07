# SLICE_BACKLOG

Ordered micro-slices. Budget: **≤3 production files / ≤120 net LOC** unless split.  
Status: `open` | `doing` | `done` | `blocked`.

---

## P0 — Bootstrap

| ID | Title | Status | Target paths (hint) | Acceptance |
|----|-------|--------|---------------------|------------|
| `boot-001` | Workspace builds empty packages | **done** | `package.json`, workspaces, `tsconfig*.json`, `packages/*/package.json` | `npm install` + `npm run typecheck` + `npm test` succeed |
| `boot-002` | Vitest + ESLint stubs wired | open | `vitest.config.ts`, `eslint.config.js`, `scripts/ci/ci_check.mjs` | `pnpm test` + `pnpm lint` run (may be empty) |
| `boot-003` | Import-graph / module-size test stubs | open | `tests/unit/architecture.test.ts` | Failing-soft or minimal asserts documented |
| `boot-004` | ADR-000 north star committed | open | `docs/adr/000-north-star.md` | ADR exists; linked from PLAN |

---

## P1 — Core (generic)

| ID | Title | Status | Acceptance |
|----|-------|--------|------------|
| `core-001` | Core types: StepId string brand, FlowStepDef, RuntimeContext base, ChatMessage, ParseResult | open | Types export; one type-level test or compile |
| `core-002` | `editDistance` / fuzzy helpers | open | Unit tests for distance |
| `core-003` | Flow graph helpers: `dependentStepIds`, validate DAG acyclic requires | open | Unit: cycle rejected; dependents correct |
| `core-004` | Session slots: patch, queue, stale, goBack (generic step ids) | open | Unit matrix for queue advance / stale |
| `core-005` | `evaluateFlowStatuses` engine taking pack predicates | open | Unit: requires gate availability |
| `core-006` | Intent parse skeleton: aliases, meta patterns, phraseScore | open | Corpus seed 5 cases green |
| `core-007` | `parsePackedUtterance` boundary split | open | Unit: two-step pack |
| `core-008` | `dispatchUserUtterance` order (disambiguation → pack → meta → single) | open | Unit: order locks; no product domain |
| `core-009` | Nav-skip types + `searchNavSkips` | open | Unit: hideWhen + query filter |
| `core-010` | Page-context bias helpers | open | Unit: route → step bias |
| `core-011` | Generic `shouldSkipLaunchSpotlight` (path + openModal hooks) | open | Unit: onPath skip |
| `core-012` | Core public barrel `index.ts` + facade test | open | Exports intentional |

---

## P2 — React Host adapter

| ID | Title | Status | Acceptance |
|----|-------|--------|------------|
| `react-001` | Provider: pack + getContext + navigate + features flags | open | Renders children; context accessible |
| `react-002` | Spotlight overlay + DOM poll controller | open | Finds `[data-guide-id]`; Escape dismiss |
| `react-003` | Field flash helper (generic class name) | open | Adds/removes flash class |
| `react-004` | Command palette UI (search + availability) | open | Disabled rows show reason |
| `react-005` | Chat FAB (typed submit → dispatch) | open | Chat-only; no checklist panel |
| `react-006` | Web Speech hook + degrade copy | open | Unsupported → type instead; no Whisper |
| `react-007` | `useGuideModal` + pendingModal bridge | open | Host can open modal by key |
| `react-008` | Host composite `<WorkflowAssistantHost />` | open | Respects feature flags |
| `react-009` | Playwright smoke: FAB open + typed utterance (demo) | open | `@guide-nlu` tag green |

---

## P3 — Schema + packs

| ID | Title | Status | Acceptance |
|----|-------|--------|------------|
| `schema-001` | JSON Schema for pack (flow, controls, intents) | open | Ajv validates `_template` |
| `schema-002` | Pack loader: JSON → runtime registries | open | Unit round-trip |
| `pack-001` | `packs/_template` empty valid pack | open | Schema green |
| `pack-002` | `packs/demo-todo` 3-step toy flow + aliases | open | Corpus ≥9 cases (3×3) |
| `pack-003` | demo-todo completeness binders + nav stubs | open | Status eval unit green |
| `corpus-001` | Shared corpus runner (Vitest) | open | Fails on alias drift |

---

## P4 — Mapper (DOM inventory)

| ID | Title | Status | Acceptance |
|----|-------|--------|------------|
| `mapper-001` | Types: ControlInventory, InventoriedControl | open | Types only + doc |
| `mapper-002` | Playwright crawler: collect interactive a11y nodes | open | Fixture HTML → ≥N controls |
| `mapper-003` | Propose `data-guide-id` slugs from role+name | open | Stable slug unit tests |
| `mapper-004` | CLI `wa-mapper crawl --url` → inventory JSON | open | Writes file |
| `mapper-005` | Merge existing `data-guide-id` without overwrite | open | Unit merge |
| `mapper-006` | Emit draft `controls` pack fragment | open | Schema-valid fragment |

---

## P5 — Codegen

| ID | Title | Status | Acceptance |
|----|-------|--------|------------|
| `codegen-001` | Emit `guideIds.ts` + controls const from pack | open | Snapshot test |
| `codegen-002` | Emit host annotation markdown checklist | open | File contains each control id |
| `codegen-003` | Wire `pnpm wa generate --pack demo-todo` | open | Docs in CONTRIBUTING |

---

## P6 — Process assist

| ID | Title | Status | Acceptance |
|----|-------|--------|------------|
| `process-001` | Jobs YAML input → draft `flow` steps (linear) | open | Author supplies job titles |
| `process-002` | Attach inventoried CTA → step via interactive map file | open | Draft nav-skip stubs |
| `process-003` | Record mode: trace clicks → ordered step candidates | open | Trace JSON → draft flow |
| `process-004` | Intent seed from step titles + control names | open | Alias list generated |
| `process-005` | Corpus seed (clean only) from aliases | open | Human expands slang later |
| `process-006` | ADR: limits of automatic process inference | open | ADR accepted |

---

## P7 — CI maturity

| ID | Title | Status | Acceptance |
|----|-------|--------|------------|
| `ci-001` | `ci_check` mirrors lint+typecheck+test | open | Script exits non-zero on fail |
| `ci-002` | Coverage floors core ≥85% / global ≥75% | open | Enforced in CI config |
| `ci-003` | Module size ≤1000 LOC gate | open | Fails on oversized file |
| `ci-004` | Pack schema gate in CI | open | Invalid pack fails CI |

---

## P8 — VB reference (later)

| ID | Title | Status | Acceptance |
|----|-------|--------|------------|
| `vb-001` | Inventory VB guide modules → pack vs core split map | open | Doc table |
| `vb-002` | Extract flow + guide ids + intents into pack draft | open | No VB API in core |
| `vb-003` | Format compiler as pack plugin interface | open | Core dispatch calls optional plugin |
| `vb-004` | Host adapter notes for VB layouts | open | Integration doc only |

---

## P9 — Publish

| ID | Title | Status | Acceptance |
|----|-------|--------|------------|
| `publish-001` | Package names + LICENSE + README install story | open | README consumer snippet works |
| `publish-002` | Changesets or manual semver policy ADR | open | ADR |
| `publish-003` | Dry-run pack publish | open | `npm pack` artifacts sane |

---

## Refactor slots (insert every 4–6 feature slices)

| ID | Title | Status |
|----|-------|--------|
| `refactor:core-split-dispatch` | Split dispatch modules if >400 LOC | open |
| `refactor:react-trim-fab` | Trim FAB chrome duplication | open |
| `refactor:mapper-extract-a11y` | Extract a11y normalize helpers | open |
