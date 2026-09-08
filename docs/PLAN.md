# UiPilot — Normative Plan

**Status:** Active  
**Repo:** standalone npm-publishable TypeScript monorepo  
**North star:** A plug-and-play **assistant generator + runtime** that coaches operators by **pressing the same buttons and filling the same forms a user would** — never by calling host product APIs. Hosts install chat FAB and/or command palette, keep pack learnings as JSON under `.uipilot/`, and generate packs via scan + optional build-time LLM.

Reference implementation (do not couple core to it): Victory Bowling `react-frontend/src/features/director-guide/`.

---

## 1. Product definition

The assistant is a **deterministic, context-aware coach** for operator workflows inside a SPA.

It is **not**:
- an LLM-driven **runtime** coach (v1 runtime NLU stays deterministic)
- a bot that **calls host product APIs** to mutate data (ADR-003)
- a silent automation path that skips visible UI confirmations/saves
- a permanent checklist side panel

It **is**:
1. **Workflow map** — typed DAG of steps; completeness/availability vs live `RuntimeContext`
2. **Control map** — stable DOM anchors (`data-guide-id`) + nav/modal/spotlight resolvers
3. **Intent detection (runtime)** — rule-based NLU → navigate → coach → optional field prefill → **UI control activation** → queue advance when the host UI signals `notifyStepCompleted`
4. **Pack builder (build-time)** — structured extractors + checklist **and** optional **LLM-assisted pack writing** (never on the hot path)

**UI-action invariant (non-negotiable):** Always simulate what a user can do (open screens, focus fields, click annotated buttons). **Do not** interface with the host’s domain HTTP/SDK APIs from the coach runtime.

**Primary surfaces (feature flags on the Host):**
- Floating chat FAB (typed + optional Web Speech)
- Ctrl/Cmd+K command palette (same registry + same context gates)
- Spotlight overlay + field flash (coaching chrome)

**Builder CLI (dev-time, not shipped into end-user runtime):**

Primary (operator façade — ADR-006):

- `uipilotCLI map` — **(2)** basic ops DAG / inventory map (mechanical)
- `uipilotCLI map --llm` — **(1)+(2)** domain-aware DAG draft after map
- `uipilotCLI tune` — **(3)** generate/saturate examples → fine-tune intents / correct DAG
- `uipilotCLI prepare` — **(2) then (3)** back-to-back (`prepare --llm` includes domain)

Atomic building blocks remain: `inventory crawl`, `dag generate`, `pack author`,
`intents check` / `tune`, `scenarios generate` / `saturate`, `pack accept`, etc.

---

## 2. Goals

| ID | Goal |
|----|------|
| G1 | **Installable packages** — `@uipilot/core`, `@uipilot/react` (and related) published or linkable via npm/pnpm |
| G2 | **Generic Core + Host** — portable flow/session/dispatch/coach primitives with no product domain baked in |
| G3 | **Pack as config (JSON)** — all scan/learn/author outputs live as configuration under one host folder; not generated app TypeScript |
| G3b | **Single install folder** — default `.uipilot/` on the host repo holds config, inventory, drafts, checklist, pack JSON |
| G4 | **Mapper / generator** — Playwright-based (and later static) inventory of interactive controls → draft control map + annotation suggestions |
| G5 | **Process authoring assist** — structured extractor + checklist; hybrid jobs/record mode into a draft flow DAG |
| G5b | **Build-time LLM pack writing (v1)** — optional LLM drafts pack **JSON** from inventory + source excerpts; **never** used at runtime; BYO credentials; Ollama / OpenAI-compatible / common cloud providers |
| G5c | **Build-time intent tuning** — users supply scenario prompts → expected step/meta/slots; LLM proposes `intents.json` / `corpus.json` updates; deterministic parser + corpus runner remain the runtime gate |
| G5d | **Scenario saturation & orthogonality** — LLM generates diverse candidate prompts; novelty + **no-lift hard stop (5×100)** even when wording still looks diverse; optional `--force=N` hard augment ignores similarity; Playwright + `intents check` find intent borders; drafts fix intents/corpus/DAG (`--accept`) |
| G5e | **Operator CLI façade** — `map` (DAG/ops), `tune` (examples + intent/DAG correction), `prepare` (map then tune); `map --llm` adds domain drafting; atomics remain for power users (ADR-006) |
| G6 | **Parity path** — extract VB Director Guide as a reference pack proving no core edits for domain specifics |
| G7 | **Quality gates** — Vitest + NLU corpus + Playwright typed coach smoke; optional saturation novelty report + tagged `@guide-saturate`; CI parity scripts; LLM drafts must pass schema + corpus gates before “done” |
| G8 | **Toggleable surfaces** — Host config: `{ chat: true/false, palette: true/false, spotlight: true/false, voice: true/false }` |
| G9 | **UI-actions only** — coach always presses/simulates real user controls; never calls host product APIs to mutate domain state (ADR-003) |
| G10 | **Host chrome personalization** — developers import `@uipilot/react`, keep training via CLI (`map`/`tune`/`prepare`), and customize FAB/chat/palette look via CSS variables + `appearance` tokens, stable `uipilot-*` classes, and optional component/slot overrides (ADR-007) — without forking dispatch or pack JSON |

---

## 3. Non-goals (v1)

| ID | Non-goal | Rationale |
|----|----------|-----------|
| NG1 | Whisper / cloud STT / audio upload | Privacy, keys, latency; Web Speech enough |
| NG2 | Firefox voice support | No reliable Web Speech recognition; type-only |
| NG3 | LLM as **runtime** NLU / dispatch | Non-deterministic; cannot corpus-gate; build-time LLM is allowed (G5b) |
| NG4 | Silent / direct API creates or writes from the coach | **UI-actions only** (ADR-003); mutations only via host UI handlers |
| NG5 | Auto-click **unannotated** UI | Only `data-guide-id` (or pack-declared) targets — still DOM, not API |
| NG5b | Coach importing or calling host `*API` / axios domain clients | Same as NG4; navigate + click only |
| NG6 | Fully automatic process DAG from DOM alone with no review | Mechanical + LLM drafts still require validate + human/CI accept |
| NG7 | Replacing host product UX | Overlay coach only |
| NG8 | Permanent checklist side panel | Chat + palette only |
| NG9 | Coupling core to Victory Bowling types/APIs | VB is a pack/host adapter |
| NG10 | Bundling or proxying vendor API keys in the published runtime | BYO keys / local Ollama only; never hardcode secrets in core |
| NG11 | Generating learnings as application TypeScript (e.g. `guideIds.ts`, binder `.ts`) | v1 learnings are JSON under `.uipilot/` only (ADR-002) |
| NG12 | Scattering scan/author outputs across the host tree | Everything under the single UiPilot home folder |
| NG13 | Unbounded LLM scenario spam without a stop rule | G5d requires an orthogonality / novelty plateau before claiming saturation |
| NG14 | Auto-merging saturation drafts into `pack/` without gates | Same as G5b/G5c: drafts → schema + `intents check` → explicit `--accept` |
| NG15 | Pack JSON owning brand colors / chat layout | Appearance is host React concern (ADR-007); packs stay workflow/NLU config |

---

## 4. Bundle boundaries

```text
┌─────────────────────────────────────────────────────────────┐
│  HOST (app)                                                 │
│  - mounts <UiPilotHost />                         │
│  - getContext() fills RuntimeContext.data                   │
│  - annotates DOM with data-guide-id (minimal host code)     │
│  - notifyStepCompleted on save                              │
│  - keeps ALL WA config/learnings in .uipilot/    │
└───────────────┬────────────────────────────▲────────────────┘
                │ imports                    │ load pack JSON
┌───────────────▼────────────────────────────┴────────────────┐
│  @uipilot/react  (Host UI adapter)               │
│  FAB · Palette · Spotlight · flash · Web Speech · Provider  │
└───────────────┬─────────────────────────────────────────────┘
                │
┌───────────────▼─────────────────────────────────────────────┐
│  @uipilot/core                                   │
│  flow eval · slots/queue · parse/dispatch · JSON binders    │
└───────────────▲─────────────────────────────────────────────┘
                │ pack JSON (config only)
┌───────────────┴─────────────────────────────────────────────┐
│  .uipilot/pack/*.json   (on the host repo)       │
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
| **Mapper / extract / author** | Yes tooling | Writes **only** into `.uipilot/` JSON |
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
G. Scenario saturation (G5d)        → LLM candidates + novelty plateau + border hunt
H. Validate                         → schema + Vitest corpus + Playwright coach smoke
```

**Record mode** (later slices): operator performs a happy path once while mapper records clicks on annotated (or provisionally matched) controls and URL transitions → suggests a linear step list the author then turns into a DAG.

**Static assist:** scan repo for routers, forms, `data-guide-id=`, and (once adopted) `notifyStepCompleted` to merge with live inventory.

**Promise:** inventory + structured draft + checklist + optional LLM pack draft that an agent/human completes under slice rules — **not** “point at any codebase and ship an unreviewed coach overnight.”

---

## 5b. Build-time LLM pack writing (v1 — normative)

### Hard boundary

| Allowed | Forbidden |
|---------|-----------|
| CLI / IDE “author” package at **pack build** time | Any LLM call inside `@uipilot/core` or Host runtime dispatch |
| Drafting `flow` / `controls` / `intents` / glossary / **corpus from user scenarios** | Replacing deterministic `parseUtterance` / `dispatchUserUtterance` at runtime |
| Tuning aliases so labeled scenarios pass the corpus runner | Calling an LLM on each end-user chat message |
| **Scenario saturation (G5d):** LLM candidate batches + deterministic novelty / plateau | Unbounded generation without a novelty stop; auto-merge without `--accept` |
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
UIPILOT_LLM_PROVIDER=openai_compatible   # or ollama
UIPILOT_LLM_BASE_URL=https://api.openai.com/v1
UIPILOT_LLM_API_KEY=sk-...
UIPILOT_LLM_MODEL=gpt-4.1-mini
# Ollama example:
# UIPILOT_LLM_PROVIDER=ollama
# UIPILOT_LLM_BASE_URL=http://127.0.0.1:11434
# UIPILOT_LLM_MODEL=llama3.2
```

### CLI shape (target)

Three phases over a host codebase:

| # | Phase | What | Primary command |
|---|-------|------|-----------------|
| 1 | **Domain** | Product / jobs / vocabulary | Via `map --llm` (or atomic `pack author`) |
| 2 | **Map** | DAG of ops + controls | `uipilotCLI map` |
| 3 | **Tune** | Diverse examples → intent borders + DAG fixes | `uipilotCLI tune` |

```bash
# All outputs land under .uipilot/ (UiPilot home) on the host repo
uipilotCLI init                              # creates .uipilot/ + empty pack stubs

# --- Primary operator façade (ADR-006) ---
uipilotCLI map [dir]                         # (2) basic map: extract/inventory → DAG draft
uipilotCLI map [dir] --llm                   # (1)+(2) map then LLM domain/DAG author → drafts/
uipilotCLI tune [dir]                        # (3) saturate examples → intents tune → mine fixes
uipilotCLI prepare [dir]                     # (2) then (3) back-to-back
uipilotCLI prepare [dir] --llm               # map --llm then tune

uipilotCLI pack accept <draftId> [dir]       # merge drafts/ into pack/ after review
uipilotCLI validate [dir]                    # schema + pack validate
uipilotCLI intents check [dir]               # deterministic scenario gate (CI)

# --- Atomic / power-user (composed by map|tune|prepare) ---
uipilotCLI inventory crawl --url http://localhost:5173
uipilotCLI extract static --src ./src
uipilotCLI dag generate                      # → structured-draft.json + checklist.json
uipilotCLI pack author                       # LLM pack JSON → drafts/ only
uipilotCLI intents tune                      # labeled scenarios → draft intents + corpus
uipilotCLI tune [dir] [--fixture] [--batch=N] [--force=N] [--label]
uipilotCLI prepare [dir] [--llm] [--fixture]
uipilotCLI scenarios generate [dir] --batch=N [--fixture] [--force=N]
uipilotCLI scenarios saturate [dir] [--batch=N] [--max-batches=N] [--fixture] [--force=N] [--label]
# --force=N (alias --hard=N): emit exactly N candidates; ignore novelty / plateau
uipilotCLI checklist md                      # human-readable checklist export
```

**Composition (normative):**

```text
map            ≈ inventory? + extract static + dag generate
map --llm      ≈ map + pack author (domain + flow/controls draft)
tune           ≈ scenarios saturate + intents tune + failure→drafts (intents/corpus/flow)
prepare        ≈ map ; tune
prepare --llm  ≈ map --llm ; tune
```

Nothing in `map` / `tune` / `prepare` writes `pack/` without an explicit accept step.

### Intent tuning from user scenarios (v1 — normative)

Users (or QA) provide labeled examples of what people will type/say and what should happen. That is the primary way to **tune** deterministic NLU without putting an LLM in the runtime path.

**Input** (JSON under UiPilot home):

```json
// .uipilot/scenarios.json
[
  {
    "id": "tourn-typo",
    "utterance": "creat a tornament",
    "expect": { "stepId": "create_tournament" }
  },
  {
    "id": "whats-next",
    "utterance": "what should I do next?",
    "expect": { "rawIntent": "whats_next" }
  },
  {
    "id": "named-event",
    "utterance": "add event named Scratch Singles",
    "expect": { "stepId": "create_event", "slots": { "name": "Scratch Singles" } }
  }
]
```

**Build-time flow:**

```text
scenarios.json
  → (optional) uipilotCLI intents tune --provider ollama
       proposes aliases / keywords / slot hints / extra corpus paraphrases
       writes drafts/<id>/intents.json + corpus.json + checklist diffs
  → --accept into pack/
  → uipilotCLI pack validate / corpus runner
       EVERY scenario must pass deterministic parseUtterance (or be marked xfail)
```

Rules:
1. Scenarios are **source of truth for acceptance**; LLM suggestions are drafts.
2. Runtime never reads `scenarios.json` for live chat — only `intents.json` + fuzzy/rules.
3. Users can also hand-edit `corpus.json` / `intents.json` without LLM.
4. `uipilotCLI intents check` (no LLM) runs scenarios against current pack and prints failures — default CI gate.

### Scenario saturation & orthogonality (v1 — normative, ADR-005)

Hand-authored scenarios under-sample intent borders. Saturation **generates volume**,
then **stops when diversity plateaus**, then **mines failures** into pack fixes.

```text
pack + inventory + structured-draft (+ redacted excerpts)
  → LLM: batch of N diverse candidate utterances (slang, typo, packed, negative, near-miss)
  → deterministic novelty vs prior pool
       lexical n-gram distance + parse-signature rarity
  → lift = parse-signature incremental novelty (intent-border new ground)
  → if lift < ε for 5 consecutive passes of 100 → NO-LIFT STOP
       (even when mean lexical novelty stays high — wording still “looks different”)
  → else if combined incremental novelty < ε for K batches → classic PLATEAU
  → OR `--force=N` / `--hard=N`: emit exactly N; ignore similarity / plateau
  → accumulate candidates; optional soft-label draft expects
  → intents check (deterministic) + Playwright @guide-saturate (typed FAB)
  → failures → drafts/ (intents, corpus, flow requires/keywords, checklist)
  → human/CI --accept → re-check → next batch or done
```

**Orthogonality / novelty (normative properties):**

| Signal | What it measures |
|--------|------------------|
| Lexical novelty | Utterance is not a near-paraphrase of something already in the pool |
| Parse-signature novelty / **lift** | Deterministic parser lands in a new/rare bucket (`stepId`, meta, null, clash) |
| Batch incremental novelty | Share (or mean) of batch members above a novelty floor vs **all prior batches** |
| Classic plateau | Consecutive batches below ε on combined novelty |
| **No-lift stop** | **5 passes × 100** with lift below ε → stop even if wording still looks diverse |
| **Hard augment** | `--force=N` emits exactly N candidates; **ignores** similarity / plateau |

Rules:
1. Novelty math is **deterministic** (no embedding API required in v1; optional later via ADR).
2. LLM proposes candidates and optional soft labels; **runtime never** calls the LLM.
3. Default stop is plateau / no-lift — not a fixed “generate 500 and quit.”
4. `--force=N` on `tune` / `scenarios generate` (and saturate) is the explicit override for fixed-size augments.
5. Playwright saturation is **tagged / opt-in**; default unit CI stays fixture-only for LLM.
6. Pack mutations still go through drafts → schema → `intents check` → `--accept`.

Default paths (overridable in `config.json`):

| File | Role |
|------|------|
| `.uipilot/config.json` | Features, `guideAttr`, home paths, author defaults (no secrets) |
| `.uipilot/inventory.json` | Last control crawl |
| `.uipilot/structured-draft.json` | Mechanical DAG/control draft |
| `.uipilot/checklist.json` | Gaps to close (binders, annotations, low-confidence edges, failing scenarios) |
| `.uipilot/scenarios.json` | User-labeled utterances → expected step/intent/slots (intent tuning input) |
| `.uipilot/saturation/candidates.json` | Accumulated generated utterances + batch ids |
| `.uipilot/saturation/novelty-report.json` | Per-batch novelty, plateau flag, ε / K used |
| `.uipilot/saturation/batches/` | Raw batch artifacts for audit |
| `.uipilot/pack/flow.json` | Steps + requires/prefers/keywords/kind |
| `.uipilot/pack/controls.json` | Guide ids, roles, nav/spotlight hints |
| `.uipilot/pack/intents.json` | Aliases, meta, slots (**tuned** from scenarios + saturation) |
| `.uipilot/pack/binders.json` | Declarative completeness (JSON DSL, not TS) |
| `.uipilot/pack/corpus.json` | NLU cases (includes accepted scenarios + paraphrases) |
| `.uipilot/pack/glossary.json` | Optional |
| `.uipilot/pack/manifest.json` | Pack id/version/title + feature flags |

**Learnings = these JSON files.** Host application code changes are limited to: installing the npm packages, mounting the Host, implementing `getContext()`, adding `data-guide-id` / `notifyStepCompleted` where the checklist asks.

`pack author` must:
1. Send **redacted** excerpts (no `.env`, no obvious secrets) + inventory + structured draft.
2. Ask the model for **JSON matching pack schema** (not free prose as source of truth).
3. Write under `.uipilot/drafts/<id>/` with an updated **checklist.json**.
4. Refuse to overwrite `pack/` without `--accept` / explicit merge.

### Quality bar for LLM drafts

- Schema validate before accept  
- Corpus runner must pass for any aliases the draft introduces (or draft marks them `proposed` until corpus exists)  
- CI for the **author package** may use recorded HTTP fixtures — never require a live LLM in default unit CI  

---

## 6. npm package UX (consumer)

```ts
import {
  UiPilotProvider,
  UiPilotHost,
  UIPILOT_CSS, // optional default chrome; override with tokens or host CSS
} from '@uipilot/react';
import { demoTodoPack } from '@my-app/assistant-pack'; // or generated from CLI map/tune

// Optional: inject defaults once, then override tokens in your CSS
// style.textContent = UIPILOT_CSS;

<UiPilotProvider
  pack={demoTodoPack}
  getContext={getRuntimeContext}
  navigate={(to) => router.push(to)}
  features={{ chat: true, palette: true, spotlight: true, voice: true }}
  appearance={{
    // maps to CSS variables on .uipilot-host-root (ADR-007)
    accent: '#0f766e',
    radius: '12px',
    font: '"Source Sans 3", system-ui, sans-serif',
  }}
  className="my-app-coach"
  // Optional escape hatch — replace chrome, keep dispatch:
  // components={{ FabButton: MyFab, ChatHeader: MyHeader }}
>
  <App />
  <UiPilotHost />
</UiPilotProvider>
```

**Dev workflow (install → train → personalize):**

```text
1. npm i @uipilot/core @uipilot/react   (+ CLI for authoring)
2. uipilotCLI init && map / tune / prepare   → .uipilot/ pack JSON
3. Mount Provider/Host; annotate data-guide-id; notifyStepCompleted
4. Personalize chat/FAB via appearance tokens, CSS overrides, or slots (G10)
```

Host implements:
- `getContext(): RuntimeContext` (shape defined by pack schema + core)
- `navigate`, optional `openModal`
- `notifyStepCompleted(stepId, meta?)` from save handlers
- DOM annotations per pack `controls`
- Optional **appearance** / **components** / host CSS for brand chrome (ADR-007)

### Host chrome personalization (v1 — normative, ADR-007)

| Layer | Mechanism | When to use |
|-------|-----------|-------------|
| 1 | Stable `uipilot-*` classes + optional `UIPILOT_CSS` | Light CSS overrides in the host app |
| 2 | CSS variables via `appearance` prop / root `className` | Brand colors, radius, font, FAB inset |
| 3 | `components` / slot overrides | Replace FAB button, chat shell, header while keeping Provider behavior |

Rules:
1. Appearance does **not** live in pack JSON (NG15).
2. Slots must call provided handlers (`onSubmit` → dispatch); no silent API writes.
3. Default look remains usable zero-config; personalization is additive.
4. Playwright targets `data-testid` / roles, not pixel colors.

---

## 7. Stack (normative)

| Concern | Use |
|---------|-----|
| Language | TypeScript strict |
| Monorepo | pnpm workspaces |
| Unit / corpus | Vitest |
| E2E / mapper crawl | Playwright |
| UI adapter | React 18+ |
| Icons (default chrome) | Optional peer; host may swap — MUI icons OK in demo; prefer `components.FabButton` slot (G10) |
| Host chrome look | CSS variables + `appearance` + `uipilot-*` classes + optional slots (ADR-007) — not pack JSON |
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
| **P4b Structured DAG extract** | `uipilotCLI dag generate` static parse → StructuredDraft + checklist |
| **P4c Build-time LLM author** | `@uipilot/author` BYO/Ollama/`pack author` → draft pack |
| **P4d Scenario saturation** | LLM candidate batches + orthogonality plateau + Playwright border hunt → pack JSON fixes |
| **P4e Operator CLI façade** | `map` / `tune` / `prepare` compose atomics (ADR-006) |
| **P4f Host chrome personalization** | CSS variables + `appearance` + optional slots (ADR-007 / G10) |
| **P5 Codegen** | Pack → TS registries + host annotation checklist |
| **P6 Process assist** | Jobs wizard / record mode → refine flow + intent seeds |
| **P7 VB reference pack** | Extract bowling domain out of VB into `packs/victory-bowling` (optional sibling) |
| **P8 Publish** | Versioned npm packages + CONTRIBUTING release notes |

---

## 9. Success criteria

1. Second pack (`demo-todo`) runs without editing core dispatch order  
2. Mapper produces a useful control inventory from a demo app  
3. `uipilotCLI dag generate` writes structured-draft + checklist under `.uipilot/`  
4. `uipilotCLI pack author` with Ollama **or** OpenAI-compatible BYO keys writes schema-valid JSON under `drafts/` (fixtures in CI)  
5. Runtime packages have **zero** required LLM dependency and load **pack JSON**, not generated TS learnings  
6. All scan/author artifacts for a host app live in **one** `.uipilot/` folder (ADR-002)  
7. Every pack step has corpus coverage before “pack done”  
8. Palette and chat agree on availability for the same context  
9. Mic works or cleanly degrades; no Whisper dependency  
10. No silent creates; Firefox users never blocked from typed assist  
11. Consumer can `npm i @uipilot/react`, run `uipilotCLI init`, and toggle chat/palette  
12. Coach paths proven via **UI clicks** (not direct host API writes) in demos/e2e (ADR-003)  
13. Saturation loop can generate large candidate pools, report **batch novelty**, and **stop on plateau** without unbounded LLM spend (ADR-005)  
14. Failures from saturation + Playwright `@guide-saturate` produce actionable drafts that improve intents / corpus / flow DAG under the same accept gates as G5c  
15. Operators can run **`map`**, **`tune`**, or **`prepare`** (map then tune) without memorizing atomic subcommands (ADR-006)  
16. Host apps can personalize FAB/chat appearance via tokens/classes/slots without forking `@uipilot/react` (ADR-007 / G10)  

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
