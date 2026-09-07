# Workflow Assistant — Normative Plan

**Status:** Active  
**Repo:** standalone npm-publishable TypeScript monorepo  
**North star:** A plug-and-play **assistant generator + runtime** that hosts can install, enable **chat FAB** and/or **command palette**, and progressively generate a **domain pack** (workflow + controls + intents) from their codebase — starting from DOM/action inventory, ending in a corpus-gated coach.

Reference implementation (do not couple core to it): Victory Bowling `react-frontend/src/features/director-guide/`.

---

## 1. Product definition

The assistant is a **deterministic, context-aware coach** for operator workflows inside a SPA.

It is **not**:
- an LLM-driven **runtime** coach (v1 runtime NLU stays deterministic)
- a silent automation bot that mutates data without the host’s normal save paths
- a permanent checklist side panel

It **is**:
1. **Workflow map** — typed DAG of steps; completeness/availability vs live `RuntimeContext`
2. **Control map** — stable DOM anchors (`data-guide-id`) + nav/modal/spotlight resolvers
3. **Intent detection (runtime)** — rule-based NLU → navigate → coach → optional slot fill → queue advance on `notifyStepCompleted`
4. **Pack builder (build-time)** — structured extractors + checklist **and** optional **LLM-assisted pack writing** (never on the hot path)

**Primary surfaces (feature flags on the Host):**
- Floating chat FAB (typed + optional Web Speech)
- Ctrl/Cmd+K command palette (same registry + same context gates)
- Spotlight overlay + field flash (coaching chrome)

**Builder CLI (dev-time, not shipped into end-user runtime):**
- `wa inventory crawl` / `wa dag generate` (mechanical)
- `wa pack author` / `wa dag assist` (LLM-assisted draft → human review → validate)

---

## 2. Goals

| ID | Goal |
|----|------|
| G1 | **Installable packages** — `@workflow-assistant/core`, `@workflow-assistant/react` (and related) published or linkable via npm/pnpm |
| G2 | **Generic Core + Host** — portable flow/session/dispatch/coach primitives with no product domain baked in |
| G3 | **Pack as config (JSON)** — all scan/learn/author outputs live as configuration under one host folder; not generated app TypeScript |
| G3b | **Single install folder** — default `.workflow-assistant/` on the host repo holds config, inventory, drafts, checklist, pack JSON |
| G4 | **Mapper / generator** — Playwright-based (and later static) inventory of interactive controls → draft control map + annotation suggestions |
| G5 | **Process authoring assist** — structured extractor + checklist; hybrid jobs/record mode into a draft flow DAG |
| G5b | **Build-time LLM pack writing (v1)** — optional LLM drafts pack **JSON** from inventory + source excerpts; **never** used at runtime; BYO credentials; Ollama / OpenAI-compatible / common cloud providers |
| G6 | **Parity path** — extract VB Director Guide as a reference pack proving no core edits for domain specifics |
| G7 | **Quality gates** — Vitest + NLU corpus + Playwright typed coach smoke; CI parity scripts; LLM drafts must pass schema + corpus gates before “done” |
| G8 | **Toggleable surfaces** — Host config: `{ chat: true/false, palette: true/false, spotlight: true/false, voice: true/false }` |

---

## 3. Non-goals (v1)

| ID | Non-goal | Rationale |
|----|----------|-----------|
| NG1 | Whisper / cloud STT / audio upload | Privacy, keys, latency; Web Speech enough |
| NG2 | Firefox voice support | No reliable Web Speech recognition; type-only |
| NG3 | LLM as **runtime** NLU / dispatch | Non-deterministic; cannot corpus-gate; build-time LLM is allowed (G5b) |
| NG4 | Silent API creates / writes | Safety; coach + navigate + prefill only |
| NG5 | Auto-click unannotated UI | Only `data-guide-id` (or pack-declared) targets |
| NG6 | Fully automatic process DAG from DOM alone with no review | Mechanical + LLM drafts still require validate + human/CI accept |
| NG7 | Replacing host product UX | Overlay coach only |
| NG8 | Permanent checklist side panel | Chat + palette only |
| NG9 | Coupling core to Victory Bowling types/APIs | VB is a pack/host adapter |
| NG10 | Bundling or proxying vendor API keys in the published runtime | BYO keys / local Ollama only; never hardcode secrets in core |
| NG11 | Generating learnings as application TypeScript (e.g. `guideIds.ts`, binder `.ts`) | v1 learnings are JSON under `.workflow-assistant/` only (ADR-002) |
| NG12 | Scattering scan/author outputs across the host tree | Everything under the single WA home folder |

---

## 4. Bundle boundaries

```text
┌─────────────────────────────────────────────────────────────┐
│  HOST (app)                                                 │
│  - mounts <WorkflowAssistantHost />                         │
│  - getContext() fills RuntimeContext.data                   │
│  - annotates DOM with data-guide-id (minimal host code)     │
│  - notifyStepCompleted on save                              │
│  - keeps ALL WA config/learnings in .workflow-assistant/    │
└───────────────┬────────────────────────────▲────────────────┘
                │ imports                    │ load pack JSON
┌───────────────▼────────────────────────────┴────────────────┐
│  @workflow-assistant/react  (Host UI adapter)               │
│  FAB · Palette · Spotlight · flash · Web Speech · Provider  │
└───────────────┬─────────────────────────────────────────────┘
                │
┌───────────────▼─────────────────────────────────────────────┐
│  @workflow-assistant/core                                   │
│  flow eval · slots/queue · parse/dispatch · JSON binders    │
└───────────────▲─────────────────────────────────────────────┘
                │ pack JSON (config only)
┌───────────────┴─────────────────────────────────────────────┐
│  .workflow-assistant/pack/*.json   (on the host repo)       │
└───────────────▲─────────────────────────────────────────────┘
                │ writes JSON only
┌───────────────┴─────────────────────────────────────────────┐
│  mapper + extract + author (CLI)                            │
│  crawl · dag generate · pack author → same folder           │
└─────────────────────────────────────────────────────────────┘
```

| Bundle | Generic? | Thinking burden |
|--------|----------|-----------------|
| **Core** | Yes | Low once extracted — pure TS; **no LLM dependency**; evaluates JSON binders |
| **React Host adapter** | Mostly yes | Medium — feature flags, a11y, voice degrade; **no LLM** |
| **Mapper / extract / author** | Yes tooling | Writes **only** into `.workflow-assistant/` JSON |
| **Pack (host folder)** | Per product | JSON config: flow, controls, intents, binders, corpus |

---

## 5. Mapper & process generation (research thesis)

### What DOM scanning *can* do well

Using **Playwright** (and/or accessibility snapshots):

1. Enumerate interactive nodes: `button`, `a`, `input`, `select`, `textarea`, `[role=button]`, `[role=link]`, `[role=tab]`, `[contenteditable]`, etc.
2. Capture for each: role, accessible name, placeholder, input type, disabled/visible, bounding box, CSS path / test id, existing `data-guide-id`, nearest form/dialog landmark, URL at discovery time.
3. Deduplicate and cluster by landmark (nav / main / dialog).
4. Emit a **ControlInventory** JSON → draft `controls` section of a pack (proposed ids like `guide-btn-create-tournament`).
5. Optionally emit an **annotation PR checklist** or codemod hints for adding `data-guide-id`.

### What DOM scanning *cannot* do alone

- Know which controls belong to which **job** (“create tournament” vs decorative chrome)
- Know **requires[]** / completeness predicates (needs app state)
- Know safe **write** vs read actions
- Infer multi-step **packed utterances** or slot schemas
- Replace human/product intent for workflow ordering

### Hybrid process mapper (planned approach)

```text
A. Crawl/inventory (Playwright)     → ControlInventory
B. Static extract (routes/forms/…)  → StructuredDraft + Checklist gaps
C. Optional record mode             → ActionTrace (url, guideId|selector, timestamp)
D. Optional LLM author (v1)         → PackDraft from A+B+C + allowed source excerpts
E. Human / CI review                → accept/reject; fill completeness binder TODOs
F. Intent + corpus seed             → aliases from titles; clean corpus; expand slang
G. Validate                         → schema + Vitest corpus + Playwright coach smoke
```

**Record mode** (later slices): operator performs a happy path once while mapper records clicks on annotated (or provisionally matched) controls and URL transitions → suggests a linear step list the author then turns into a DAG.

**Static assist:** scan repo for routers, forms, `data-guide-id=`, and (once adopted) `notifyStepCompleted` to merge with live inventory.

**Promise:** inventory + structured draft + checklist + optional LLM pack draft that an agent/human completes under slice rules — **not** “point at any codebase and ship an unreviewed coach overnight.”

---

## 5b. Build-time LLM pack writing (v1 — normative)

### Hard boundary

| Allowed | Forbidden |
|---------|-----------|
| CLI / IDE “author” package at **pack build** time | Any LLM call inside `@workflow-assistant/core` or Host runtime dispatch |
| Drafting `flow` / `controls` links / `intents` aliases / glossary / corpus *seeds* | Replacing deterministic `parseUtterance` / `dispatchUserUtterance` |
| User-supplied credentials and base URLs | Shipping our keys; logging prompts that contain secrets |

### Provider model (BYO)

Support via a thin **OpenAI-compatible** HTTP client plus explicit adapters:

| Provider class | Examples | Config |
|----------------|----------|--------|
| OpenAI-compatible HTTP | OpenAI, Azure OpenAI (compat mode), Groq, Together, many gateways | `baseUrl`, `apiKey`, `model` |
| Ollama | Local / LAN Ollama | `baseUrl` default `http://127.0.0.1:11434`, optional key, `model` |
| Other self-host | LM Studio, vLLM, LocalAI, text-generation-webui (OpenAI-compat endpoints) | Same as OpenAI-compatible |

Credentials **only** from env / local config (never committed):

```bash
WA_LLM_PROVIDER=openai_compatible   # or ollama
WA_LLM_BASE_URL=https://api.openai.com/v1
WA_LLM_API_KEY=sk-...
WA_LLM_MODEL=gpt-4.1-mini
# Ollama example:
# WA_LLM_PROVIDER=ollama
# WA_LLM_BASE_URL=http://127.0.0.1:11434
# WA_LLM_MODEL=llama3.2
```

### CLI shape (target)

```bash
# All outputs land under .workflow-assistant/ (WA home) on the host repo
wa init                              # creates .workflow-assistant/config.json + empty pack stubs
wa inventory crawl --url http://localhost:5173
wa dag generate --src ./src          # → structured-draft.json + checklist.json
wa pack author --provider ollama     # → drafts/<ts>/ then merge with --accept
wa pack validate                     # validates .workflow-assistant/pack
```

Default paths (overridable in `config.json`):

| File | Role |
|------|------|
| `.workflow-assistant/config.json` | Features, `guideAttr`, home paths, author defaults (no secrets) |
| `.workflow-assistant/inventory.json` | Last control crawl |
| `.workflow-assistant/structured-draft.json` | Mechanical DAG/control draft |
| `.workflow-assistant/checklist.json` | Gaps to close (binders, annotations, low-confidence edges) |
| `.workflow-assistant/pack/flow.json` | Steps + requires/prefers/keywords/kind |
| `.workflow-assistant/pack/controls.json` | Guide ids, roles, nav/spotlight hints |
| `.workflow-assistant/pack/intents.json` | Aliases, meta, slots |
| `.workflow-assistant/pack/binders.json` | Declarative completeness (JSON DSL, not TS) |
| `.workflow-assistant/pack/corpus.json` | NLU cases |
| `.workflow-assistant/pack/glossary.json` | Optional |
| `.workflow-assistant/pack/manifest.json` | Pack id/version/title + feature flags |

**Learnings = these JSON files.** Host application code changes are limited to: installing the npm packages, mounting the Host, implementing `getContext()`, adding `data-guide-id` / `notifyStepCompleted` where the checklist asks.

`pack author` must:
1. Send **redacted** excerpts (no `.env`, no obvious secrets) + inventory + structured draft.
2. Ask the model for **JSON matching pack schema** (not free prose as source of truth).
3. Write under `.workflow-assistant/drafts/<id>/` with an updated **checklist.json**.
4. Refuse to overwrite `pack/` without `--accept` / explicit merge.

### Quality bar for LLM drafts

- Schema validate before accept  
- Corpus runner must pass for any aliases the draft introduces (or draft marks them `proposed` until corpus exists)  
- CI for the **author package** may use recorded HTTP fixtures — never require a live LLM in default unit CI  

---

## 6. npm package UX (consumer)

```ts
import {
  WorkflowAssistantProvider,
  WorkflowAssistantHost,
} from '@workflow-assistant/react';
import { demoTodoPack } from '@my-app/assistant-pack'; // or generated

<WorkflowAssistantProvider
  pack={demoTodoPack}
  getContext={getRuntimeContext}
  navigate={(to) => router.push(to)}
  features={{ chat: true, palette: true, spotlight: true, voice: true }}
>
  <App />
  <WorkflowAssistantHost />
</WorkflowAssistantProvider>
```

Host implements:
- `getContext(): RuntimeContext` (shape defined by pack schema + core)
- `navigate`, optional `openModal`
- `notifyStepCompleted(stepId, meta?)` from save handlers
- DOM annotations per pack `controls`

---

## 7. Stack (normative)

| Concern | Use |
|---------|-----|
| Language | TypeScript strict |
| Monorepo | pnpm workspaces |
| Unit / corpus | Vitest |
| E2E / mapper crawl | Playwright |
| UI adapter | React 18+ |
| Icons (default chrome) | Optional peer; host may swap — MUI icons OK in demo |
| NLU (runtime) | Aliases + regex + Levenshtein — **no LLM on the hot path** |
| Pack author (build) | Structured extract + checklist + **optional LLM** (BYO / Ollama / OpenAI-compat) |
| Voice | Web Speech API only; Chrome / Edge / Safari; Firefox type-only |
| Schema | JSON Schema (Ajv) for packs |

---

## 8. Phases

| Phase | Outcome |
|-------|---------|
| **P0 Bootstrap** | Repo, CI stubs, docs of record, empty packages build |
| **P1 Core extract** | Generic flow/session/parse/dispatch from VB lessons |
| **P2 React surfaces** | Provider + FAB + palette + spotlight + voice feature flags |
| **P3 Schema + template pack** | Validate packs; `_template` + `demo-todo` toy pack |
| **P4 Mapper inventory** | Playwright crawl → ControlInventory → draft controls |
| **P4b Structured DAG extract** | `wa dag generate` static parse → StructuredDraft + checklist |
| **P4c Build-time LLM author** | `@workflow-assistant/author` BYO/Ollama/`pack author` → draft pack |
| **P5 Codegen** | Pack → TS registries + host annotation checklist |
| **P6 Process assist** | Jobs wizard / record mode → refine flow + intent seeds |
| **P7 VB reference pack** | Extract bowling domain out of VB into `packs/victory-bowling` (optional sibling) |
| **P8 Publish** | Versioned npm packages + CONTRIBUTING release notes |

---

## 9. Success criteria

1. Second pack (`demo-todo`) runs without editing core dispatch order  
2. Mapper produces a useful control inventory from a demo app  
3. `wa dag generate` writes structured-draft + checklist under `.workflow-assistant/`  
4. `wa pack author` with Ollama **or** OpenAI-compatible BYO keys writes schema-valid JSON under `drafts/` (fixtures in CI)  
5. Runtime packages have **zero** required LLM dependency and load **pack JSON**, not generated TS learnings  
6. All scan/author artifacts for a host app live in **one** `.workflow-assistant/` folder (ADR-002)  
7. Every pack step has corpus coverage before “pack done”  
8. Palette and chat agree on availability for the same context  
9. Mic works or cleanly degrades; no Whisper dependency  
10. No silent creates; Firefox users never blocked from typed assist  
11. Consumer can `npm i @workflow-assistant/react`, run `wa init`, and toggle chat/palette  

---

## 10. Docs of record

| Doc | Role |
|-----|------|
| `docs/PLAN.md` | This file |
| `docs/PLAN_GAP.md` | Epic ledger |
| `docs/SLICE_BACKLOG.md` | Ordered micro-slices |
| `docs/PROGRESS.md` | Session ledger |
| `docs/adr/*` | Decisions |
| `ARCHITECTURE.md` | Layers, imports, size budgets |
| `CONTRIBUTING.md` | Setup / CI |
| `SECURITY.md` | Secrets / voice / safety |
| `tests/README.md` | Test policy |

Agent ceremony follows `.cursor/rules/typescript-slice-master.mdc`.
