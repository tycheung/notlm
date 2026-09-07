# Architecture

## Layers

```text
host-app/
  .workflow-assistant/     → ALL config + scan/author learnings (JSON only)  [ADR-002]
  src/…                    → getContext, data-guide-id, notifyStepCompleted

npm: @workflow-assistant/react  → UI Host (depends on core)
npm: @workflow-assistant/core   → pure TS runtime; loads/evaluates pack JSON
CLI: mapper / extract / author  → write JSON into .workflow-assistant/ only
npm: @workflow-assistant/schema → JSON Schema for the folder format
```

### Import rules (enforced later by `boot-003` / `ci`)

- `core` must not import `react`, `mapper`, `author`, or host app code.
- `react` may import `core` only — **never** `author`.
- `mapper` / `author` may import `core` types + `schema`; they write **files**, not TS into `src/`.
- Default unit CI must not require a live LLM; author tests use fixtures.

## Size budgets

| Soft | Hard |
|------|------|
| ~400 LOC / module | 1000 LOC / module (CI fail) |

Prefer extract/split over growing god files (`dispatchUserUtterance` lesson from VB).

## Runtime data flow

```text
User utterance / palette pick
  → react Host
  → core.dispatch(packJson, session, ctx, utterance)
  → nav resolve from controls.json
  → host.navigate + optional spotlight/flash
  → host save → notifyStepCompleted → queue advance
```

## Host folder (canonical — ADR-002)

```text
.workflow-assistant/
  config.json
  scenarios.json           # labeled utterances for intent tuning (ADR-001)
  inventory.json
  structured-draft.json
  checklist.json
  pack/
    manifest.json
    flow.json
    controls.json
    intents.json
    binders.json      # declarative completeness DSL
    corpus.json
    glossary.json     # optional
  drafts/             # LLM proposals before --accept
  traces/             # optional record mode
```

**Invariant:** scan / LLM assist / dag generate update **only** this tree (JSON). They do not emit application TypeScript learnings.

## Binder DSL (sketch — locked in schema-* slices)

```json
{
  "create_list": { "path": "data.listCount", "op": "gte", "value": 1 },
  "add_item": {
    "all": [
      { "path": "data.listCount", "op": "gte", "value": 1 },
      { "path": "data.itemCount", "op": "gte", "value": 1 }
    ]
  }
}
```

Core evaluates these against `RuntimeContext.data` from the host’s `getContext()`.

## Coaching DOM

Default attribute: `data-guide-id="<id>"` (set in `config.json` → `guideAttr`).  
Spotlight and flash **only** query this contract.

## Voice

`packages/react` Web Speech wrapper only. Product policy: Chrome / Edge / Safari; Firefox type-only; no cloud STT.
