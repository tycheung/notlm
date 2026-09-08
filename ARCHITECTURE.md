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
    faq.json          # optional (merged with packs/_base-en)
    lookups.json      # optional entity name-match vs getContext().data
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
powers `explain_field`. Optional `faq.json` answers blurb-led product questions
before the “didn’t catch that” fallback (merged with portable `packs/_base-en/faq.json`
greetings). Meta `help` / “what can you do” lists **currently available** flow steps.
Optional `lookups.json` fuzzy-matches names against host-published arrays on
`getContext().data` and flashes row `data-guide-id`s (UI-actions only).
Control `userFill` guide ids trigger a **sequential** scroll + 3× blink tour for
fields the coach cannot type (e.g. the user’s name).

**User-ask saturation:** `uipilotCLI scenarios ask --force=5000..10000 --blurb="…"`
generates naturalistic questions from a 30s description (not DAG aliases);
`scenarios label-pool` soft-labels the whole pool into scenarios + FAQ drafts for
`intents tune` / `pack accept`.

### Optional ONNX intent+slot ranker

Default NLU remains rule-based (`parseUtterance`). Hosts may opt into a
corpus-trained tiny hashed-ngram ranker:

1. `uipilotCLI ranker train ./app` → `pack/ranker.json` (+ `ranker.onnx`)
2. Enable with `features.onnxRanker: true` or `UIPILOT_ONNX_RANKER=1`
3. Pass `parseUtteranceFn` from `@uipilot/ranker` (`createJsonHybridParser` /
   `createHybridUtteranceParser` with lazy ONNX runtime)

`onnxruntime-node` / `onnxruntime-web` are **optional peers** — missing ORT falls
back to pure-TS JSON inference. Low-confidence ranker scores fall back to rules.

## Conversational maturity (G11 / ADR-008)

Runtime stays deterministic. LLM-*feel* comes from:

- **Repair banks** (`repair.*` in `replies.json`) for blocked / ambiguous / unknown / low-confidence
- **Confidence tiers** on rule parse (`high` / `mid` / `low`) — low asks before acting
- **Discourse** anaphora + light repair (“again”, “change the name”, “undo that”)
- **Gate policy** — chat launches honor slots/confirm; packed/queue/`executeStep` resume skip; proactive Yes skips confirm (ADR-008)
- **Telemetry** — optional `onCoachEvent` for hosts (intent/pending/blocked/launched; no secrets)
- **Optional ranker** — demo-todo may enable JSON/ORT hybrid via `features.onnxRanker` / env

## Voice

`packages/react` Web Speech wrapper only. Product policy: Chrome / Edge / Safari; Firefox type-only; no cloud STT.
Corpus includes truncated-STT utterances; Playwright Firefox project is type-only smoke.
