# Workflow Assistant — Normative Plan

**Status:** Active  
**Repo:** standalone npm-publishable TypeScript monorepo  
**North star:** A plug-and-play **assistant generator + runtime** that hosts can install, enable **chat FAB** and/or **command palette**, and progressively generate a **domain pack** (workflow + controls + intents) from their codebase — starting from DOM/action inventory, ending in a corpus-gated coach.

Reference implementation (do not couple core to it): Victory Bowling `react-frontend/src/features/director-guide/`.

---

## 1. Product definition

The assistant is a **deterministic, context-aware coach** for operator workflows inside a SPA.

It is **not**:
- a free-form LLM agent (v1)
- a silent automation bot that mutates data without the host’s normal save paths
- a permanent checklist side panel

It **is**:
1. **Workflow map** — typed DAG of steps; completeness/availability vs live `RuntimeContext`
2. **Control map** — stable DOM anchors (`data-guide-id`) + nav/modal/spotlight resolvers
3. **Intent detection** — rule-based NLU → navigate → coach → optional slot fill → queue advance on `notifyStepCompleted`

**Primary surfaces (feature flags on the Host):**
- Floating chat FAB (typed + optional Web Speech)
- Ctrl/Cmd+K command palette (same registry + same context gates)
- Spotlight overlay + field flash (coaching chrome)

---

## 2. Goals

| ID | Goal |
|----|------|
| G1 | **Installable packages** — `@workflow-assistant/core`, `@workflow-assistant/react` (and related) published or linkable via npm/pnpm |
| G2 | **Generic Core + Host** — portable flow/session/dispatch/coach primitives with no product domain baked in |
| G3 | **Pack as the domain brain** — steps, guide ids, aliases, glossary, completeness binders, optional compilers live in packs |
| G4 | **Mapper / generator** — Playwright-based (and later static) inventory of interactive controls → draft control map + annotation suggestions |
| G5 | **Process authoring assist** — help humans/agents turn jobs-to-be-done + mapper output into a flow DAG + intents + corpus (not fully automatic magic) |
| G6 | **Parity path** — extract VB Director Guide as a reference pack proving no core edits for domain specifics |
| G7 | **Quality gates** — Vitest + NLU corpus + Playwright typed coach smoke; CI parity scripts |
| G8 | **Toggleable surfaces** — Host config: `{ chat: true/false, palette: true/false, spotlight: true/false, voice: true/false }` |

---

## 3. Non-goals (v1)

| ID | Non-goal | Rationale |
|----|----------|-----------|
| NG1 | Whisper / cloud STT / audio upload | Privacy, keys, latency; Web Speech enough |
| NG2 | Firefox voice support | No reliable Web Speech recognition; type-only |
| NG3 | LLM as primary NLU | Non-deterministic; cannot corpus-gate like VB |
| NG4 | Silent API creates / writes | Safety; coach + navigate + prefill only |
| NG5 | Auto-click unannotated UI | Only `data-guide-id` (or pack-declared) targets |
| NG6 | Fully automatic process DAG from DOM alone | DOM shows *controls*, not *jobs*; hybrid authoring required |
| NG7 | Replacing host product UX | Overlay coach only |
| NG8 | Permanent checklist side panel | Chat + palette only |
| NG9 | Coupling core to Victory Bowling types/APIs | VB is a pack/host adapter |

---

## 4. Bundle boundaries

```text
┌─────────────────────────────────────────────────────────────┐
│  HOST (app)                                                 │
│  - mounts <WorkflowAssistantHost config=… />                │
│  - supplies RuntimeContext (React Query / store / props)    │
│  - annotates DOM with data-guide-id                         │
│  - calls notifyStepCompleted on save                        │
│  - owns routing & mutations                                 │
└───────────────┬────────────────────────────▲────────────────┘
                │ imports                    │ pack + context
┌───────────────▼────────────────────────────┴────────────────┐
│  @workflow-assistant/react  (Host UI adapter)               │
│  FAB · Palette · Spotlight · flash · Web Speech · Provider  │
└───────────────┬─────────────────────────────────────────────┘
                │
┌───────────────▼─────────────────────────────────────────────┐
│  @workflow-assistant/core                                   │
│  flow eval · slots/queue/stale · parse/dispatch · nav types │
│  fuzzy · page bias · skip-launch hooks (generic)            │
└───────────────▲─────────────────────────────────────────────┘
                │ loaded pack
┌───────────────┴─────────────────────────────────────────────┐
│  PACK (per product)                                         │
│  flow · controls · intents · glossary · corpus · binders    │
│  optional domain compilers (e.g. VB format builder)         │
└───────────────▲─────────────────────────────────────────────┘
                │ generates / drafts
┌───────────────┴─────────────────────────────────────────────┐
│  @workflow-assistant/mapper + codegen                       │
│  Playwright DOM/a11y crawl · propose guide ids · pack stub  │
│  JSON Schema validate · emit TS registries                  │
└─────────────────────────────────────────────────────────────┘
```

| Bundle | Generic? | Thinking burden |
|--------|----------|-----------------|
| **Core** | Yes | Low once extracted — pure TS |
| **React Host adapter** | Mostly yes | Medium — feature flags, a11y, voice degrade |
| **Mapper / codegen** | Yes tooling | High — how to infer *process* not just buttons |
| **Pack** | No — per product | Highest — jobs, deps, completeness, language |

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
B. Optional record mode             → ActionTrace (url, guideId|selector, timestamp)
C. Authoring assist (CLI / agent)   → draft flow steps from named jobs + mapped CTAs
D. Completeness stubs               → TODO binders host must implement
E. Intent seed                      → aliases from control names + step titles
F. Corpus seed                      → clean utterances from aliases; human expands slang/typos
G. Validate                         → schema + Vitest corpus + Playwright coach smoke
```

**Record mode** (later slices): operator performs a happy path once while mapper records clicks on annotated (or provisionally matched) controls and URL transitions → suggests a linear step list the author then turns into a DAG.

**Static assist** (later): scan repo for `data-guide-id=` and React Router routes to merge with live inventory.

Do **not** promise “point at any codebase and get a finished coach overnight.” Promise “inventory + draft pack + checklist that an agent can complete under slice rules.”

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
| NLU | Aliases + regex + Levenshtein — **no LLM v1** |
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
| **P5 Codegen** | Pack → TS registries + host annotation checklist |
| **P6 Process assist** | Jobs wizard / record mode → draft flow + intent seeds |
| **P7 VB reference pack** | Extract bowling domain out of VB into `packs/victory-bowling` (optional sibling) |
| **P8 Publish** | Versioned npm packages + CONTRIBUTING release notes |

---

## 9. Success criteria

1. Second pack (`demo-todo`) runs without editing core dispatch order  
2. Mapper produces a useful control inventory from a demo app  
3. Every pack step has corpus coverage before “pack done”  
4. Palette and chat agree on availability for the same context  
5. Mic works or cleanly degrades; no Whisper dependency  
6. No silent creates; Firefox users never blocked from typed assist  
7. Consumer can `pnpm add @workflow-assistant/react` and toggle chat/palette  

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
