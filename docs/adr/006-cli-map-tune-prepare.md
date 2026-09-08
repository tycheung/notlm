# ADR-006 — Operator CLI façade (map / tune / prepare)

## Status

Accepted

## Context

Over a host codebase, UiPilot’s build-time job is three phases:

1. **Domain** — what product / jobs / vocabulary the app is about  
2. **Map** — DAG of operator steps + control inventory (ops graph)  
3. **Tune** — generate diverse utterance examples, fine-tune intent classification,
   and correct the DAG / intents when borders fail  

Atomic commands already exist or are planned (`inventory crawl`, `dag generate`,
`pack author`, `intents tune`, `scenarios saturate`, …). Operators need a **small
primary surface**: run map alone, tune alone, or both back-to-back — without
memorizing the pipeline.

## Decision

### Primary commands (normative)

| Command | Phase | Behavior |
|---------|-------|----------|
| `uipilotCLI map [dir]` | **(2)** basic map | Mechanical pipeline: inventory (if inputs given) → `extract static` / `dag generate` → `structured-draft.json` + checklist. **No LLM required.** |
| `uipilotCLI map [dir] --llm` | **(1)+(2)** | After basic map, run LLM pack author assist to draft domain-aware `flow` / controls / glossary under `drafts/` (still `--accept` to merge). |
| `uipilotCLI tune [dir]` | **(3)** | Scenario generate/saturate (novelty plateau) → soft-label / `intents tune` → failure mining drafts for intents + corpus + DAG corrections. LLM for generation/tune; gates stay deterministic. |
| `uipilotCLI prepare [dir]` | **(2) then (3)** | Runs `map` then `tune` sequentially on the same UiPilot home. `prepare --llm` ≡ `map --llm` then `tune`. |

Accept remains explicit: `uipilotCLI pack accept <draftId>` (or documented accept flags). Never silent overwrite of `pack/`.

### Atomic commands (power users / CI)

Keep and document as building blocks:

```text
init · validate · inventory crawl · extract static · dag generate
pack author · pack accept · intents check · intents tune
scenarios generate · scenarios saturate · checklist md · jobs import · trace ingest
```

`map` / `tune` / `prepare` **compose** these; they do not replace them.

### Domain (phase 1)

Domain inference is **not** a separate required primary command in v1. It is:

- implied weakly by mechanical map (routes, forms, control names), and  
- made explicit when `map --llm` / `pack author` drafts pack JSON from inventory + excerpts.

A future `discover` alias may thin-wrap `map --llm` if UX needs it — not required now.

## Consequences

- PLAN CLI section lists primary vs atomic commands.
- Slices `cli-*` implement façades on top of existing/planned atomics.
- CONTRIBUTING documents the three-phase operator loop.
- ADR-005 saturation lives under `tune` / `prepare`, not a fourth primary verb.
