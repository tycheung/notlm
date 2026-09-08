# Architecture

## Layers

```text
host-app/
  .uipilot/     → ALL config + scan/author learnings (JSON only)
  src/…                    → getContext, data-guide-id, notifyStepCompleted

npm: @uipilot/react  → UI Host (depends on core)
npm: @uipilot/core   → pure TS runtime; loads/evaluates pack JSON
CLI: mapper / extract / author  → write JSON into .uipilot/ only
     primary façade: map | tune | prepare
npm: @uipilot/schema → JSON Schema for the folder format
```

### Import rules

- `core` must not import `react`, `mapper`, `author`, or host app code.
- `react` may import `core` only — **never** `author`.
- `mapper` / `author` may import `core` types + `schema`; they write **files**, not TS into `src/`.
- Default unit CI must not require a live LLM; author tests use fixtures.

## Size budgets

| Soft | Hard |
|------|------|
| ~400 LOC / module | 1000 LOC / module (CI fail) |

Prefer extract/split over growing god files.

## Runtime data flow

```text
User utterance / palette pick
  → react Host
  → core.dispatch(packJson, session, ctx, utterance)
  → nav resolve from controls.json
  → host.navigate + optional spotlight/flash
  → host save → notifyStepCompleted → queue advance
```

## Host folder

```text
.uipilot/
  config.json
  scenarios.json           # labeled utterances for intent tuning
  saturation/              # candidates, novelty reports, batches
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

## Binder DSL

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

## Coaching DOM / actions

Default attribute: `data-guide-id="<id>"` (set in `config.json` → `guideAttr`).  
Spotlight and flash **only** query this contract.

**UI-actions only:** `executeStep` resolves to path / modal / spotlight / prefill.
The coach must not import host `*API` clients or issue domain HTTP. Playwright demos
**click** annotated controls.

**Chrome personalization:** Hosts brand FAB/chat/palette via CSS variables
(`appearance` prop), stable `uipilot-*` classes, and optional `components` slots.
Pack JSON does not store brand colors. Dispatch and guide-id coaching stay unchanged.

Assistant chat may attach **choice chips** (`ChatMessage.choices`) for ambiguous
utterances and unintelligible next-up offers. Prefill applies to annotated inputs
via `data-guide-id` (slot key / `guide-*` candidates). Optional `glossary.json`
powers `explain_field`.

## Voice

`packages/react` Web Speech wrapper only. Product policy: Chrome / Edge / Safari; Firefox type-only; no cloud STT.
