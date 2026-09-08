# ADR-004 — Limits of automatic process inference

## Status

Accepted (stub)

## Context

Static extractors and record-mode traces can propose screens, write candidates, and ordered step drafts. Authors may expect the tool to invent a complete process DAG (`requires`, binders, intents) from UI structure alone. That over-promises: route tables and click order are weak signals for real business prerequisites.

## Decision

1. **Never invent high-confidence `requires`.** Auto-generated edges (linear jobs YAML chaining, trace ordering, optional extract linearization) MUST set `confidence: 'low'` on those steps (extract-006 / process-006). Prefer empty `requires` when unsure.
2. **Traces are drafts, not truth.** `uipilotCLI trace ingest` writes `drafts/` + `traces/` for human review; accept remains explicit.
3. **Intents/corpus seeds stay clean.** Alias and corpus seeds come from titles/names only; slang and domain jargon stay human-authored.
4. **Jobs YAML is author-supplied structure.** The importer materializes linear flow; it does not discover process from the product codebase.

## Consequences

- Checklist items flag write candidates and binder review rather than claiming a finished DAG.
- Runtime packs still require human accept after review.
- Future richer inference stays behind the same confidence / draft gates.
