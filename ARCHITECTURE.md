# Architecture

## Layers

```text
apps/demo                  → consumes react + demo-todo pack
packages/react             → UI Host adapter (depends on core)
packages/core              → pure TS runtime (no React, no DOM optional split)
packages/mapper            → Playwright crawl (Node; may depend on core types only)
packages/codegen           → pack → TS emit (depends on schema)
packages/schema            → JSON Schema + validate helpers
packs/*                    → data + generated registries (no imports into core)
```

### Import rules (enforced later by `boot-003` / `ci`)

- `core` must not import `react`, `mapper`, `apps`, or any `packs/*` implementation code at runtime (packs are data loaded by host).
- `react` may import `core` only among workspace packages.
- `mapper` / `codegen` may import `core` types + `schema`.
- `apps/*` may import `react`, `core`, and a chosen pack.

## Size budgets

| Soft | Hard |
|------|------|
| ~400 LOC / module | 1000 LOC / module (CI fail) |

Prefer extract/split over growing god files (`dispatchUserUtterance` lesson from VB).

## Runtime data flow

```text
User utterance / palette pick
  → react Host
  → core.dispatch(pack, session, ctx, utterance)
  → nav resolve (pack)
  → host.navigate + optional spotlight/flash
  → host save → notifyStepCompleted → queue advance
```

## Pack artifact (logical)

```text
pack/
  pack.json          # id, version, feature defaults
  flow.json          # steps DAG
  controls.json      # guide ids + roles
  intents.json       # aliases, meta, slots
  glossary.json      # optional
  corpus.json        # NLU cases
  binders            # completeness fns — TS module supplied by host or generated stubs
```

Exact on-disk shape evolves under `schema-*` slices; validate with Ajv.

## Coaching DOM

Default attribute: `data-guide-id="<id>"` (configurable later via ADR).  
Spotlight and flash **only** query this contract.

## Voice

`packages/react` Web Speech wrapper only. Product policy: Chrome / Edge / Safari; Firefox type-only; no cloud STT.
