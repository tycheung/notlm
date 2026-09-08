# ADR-005 — Scenario saturation & orthogonality (build-time)

## Status

Accepted

## Context

G5c lets humans (or QA) supply labeled `scenarios.json` and optionally LLM-tune
`intents.json` / `corpus.json`. That still leaves two gaps:

1. **Coverage is hand-seeded.** Teams do not know when they have enough utterances
   to stress intent borders (typos, slang, packed steps, negatives, near-misses).
2. **Volume without diversity wastes review.** Generating hundreds of near-duplicate
   paraphrases does not find new classification borders or DAG gaps.

We want a **build-time** loop that (a) uses an LLM to invent diverse candidate
prompts about the host workflow / codebase surface, (b) measures incremental
**new ground** vs prior batches, (c) stops when novelty plateaus, and (d) feeds
failures into intent + flow DAG fixes — still accepted only after deterministic
gates.

Runtime NLU stays rule-based (ADR-001). Playwright remains typed coach smoke
(ADR-003); saturation e2e is opt-in / tagged, not a live-LLM CI dependency.

## Decision

1. **Build-time only** in `@uipilot/author` + CLI. No LLM on the runtime hot path.
2. **Candidate generation:** LLM proposes unlabeled (or soft-labeled) utterance
   batches from pack + inventory + structured draft + redacted excerpts.
3. **Orthogonality / novelty metric (deterministic):** each candidate is scored
   against the prior pool using at least:
   - **Lexical novelty** — char/word n-gram Jaccard (or equivalent) distance to
     nearest prior utterance.
   - **Parse-signature novelty** — outcome bucket from deterministic
     `parseUtterance` / `intents check` (`stepId` | `rawIntent` | null |
     disambiguation / multi-match). New or rare signatures count as new ground.
   Combined into a per-utterance novelty score; **batch incremental novelty** is
   the share (or mean) of utterances above a novelty floor. **Plateau** when
   consecutive batches fall below ε (configurable).
4. **Saturation loop:** generate → score → (stop | continue) → optional soft-label
   → deterministic check + tagged Playwright coach run → mine failures into
   `drafts/` for intents / corpus / flow `requires` / checklist — merge only with
   `--accept` after schema + `intents check` green.
5. **No-lift hard stop (even when wording still looks diverse):** if **5 consecutive
   passes of 100** candidates show **no lift** (parse-signature / intent-border
   incremental novelty below ε) — stop, even when mean lexical novelty stays high
   (“prompts still look different”). Defaults: `noLiftPasses=5`,
   `noLiftBatchSize=100`. Configurable in plateau config / CLI.
6. **Hard augment (`--force=N`):** phase **(3) tune / scenarios generate** may take
   `--force=N` (alias `--hard=N`) to emit **exactly N** candidates and **ignore**
   similarity / novelty / plateau. Use when the operator wants a fixed corpus size.
7. **Artifacts** under `.uipilot/` only (ADR-002): e.g.
   `saturation/candidates.json`, `saturation/novelty-report.json`,
   `saturation/batches/`, plus existing `scenarios.json` / `drafts/`.
8. Default unit CI uses fixtures; live LLM + full Playwright saturation are
   **opt-in** (`--with-saturation` / tagged `@guide-saturate`).
9. Operator entry for this loop is **`uipilotCLI tune`** (and **`prepare`**, which
   runs map then tune). Atomic `scenarios generate` / `saturate` remain for CI and
   power users (ADR-006). `--force=N` applies to `tune` and `scenarios generate`
   (and saturate when forcing a fixed count).

## Consequences

- PLAN gains **G5d**; epic `saturate*` and slices in `SLICE_BACKLOG`.
- Extends G5c / author CLI; does not weaken ADR-001 or ADR-003.
- Novelty math lives in author (or a tiny pure helper importable by CLI tests) —
  never required by `@uipilot/core` runtime.
- Human review remains the accept gate for pack JSON mutations.
- Primary verbs: see **ADR-006** (`map` / `tune` / `prepare`).
