# Architecture

## Ownership

| Lives here | Examples |
|------------|----------|
| **This repo (`notlm`)** | `@notlm/core`, `react`, `ranker`, `schema`, `ops`; demo packs only |
| **Host app** | `.notlm/pack/*.json` (product words, aliases, `productRole`, heuristics) |
| **Offline training** | Separate tooling: miss→draft→accept; workshop writing into a host `.notlm/` |

This repo must not contain host-brand product packs. Demo packs
(`demo-todo`, `demo-crm`, `demo-hello`, `_base-en`, `_template`) are the only
first-class pack trees here.

## Layers

```text
host-app/
  .notlm/     → config + pack JSON
  src/…       → getContext, data-guide-id, notifyStepCompleted

npm: @notlm/react  → UI Host (depends on core)
npm: @notlm/core   → pack NLU + dispatch
npm: @notlm/core/loadFolder → Node FS loader
npm: @notlm/core/internal → advanced shards (prefer not to depend from hosts)
npm: @notlm/schema → pack + miss/exchange schemas
npm: @notlm/ranker → optional hybrid / ONNX infer
npm: @notlm/ops    → Laya / Celery / FastAPI templates (`notlmCLI laya install`)
CLI: init / validate / intents check / ranker check
```

Platform OOD defaults (`heuristicsDefaults`) are generic English refuse/OOD lists.
Override with pack `heuristics.json`. Never put host brand tokens in platform defaults.

### Import rules

- `core` must not import `react` or host app code.
- `react` may import `core` only.
- Offline tooling may write **files** under `.notlm/`, not TypeScript into host `src/`.
- Host BYO `fallbackLlm` is a host-owned HTTP proxy — not a provider SDK in the browser.
- Default unit CI must not require a live LLM.

## Size budgets

| Soft | Hard |
|------|------|
| ~400 LOC / module | 1000 LOC / module (CI fail) |

## Runtime data flow

```text
User utterance / palette pick
  → react Host
  → core.dispatch (pack smart cache)
  → on miss: host fallbackLlm → Laya /decide → optional secondary LLM
  → nav resolve from controls.json
  → host.navigate + optional spotlight/flash
  → host save → notifyStepCompleted → queue advance
```

NotLM is a **generic SPA chatbot frontline**. Coaching (`data-guide-id`, spotlight,
`coachMessage`) is an optional pack pattern. Domain words and `productRole` live
in host pack JSON only.

## Host folder

```text
.notlm/
  config.json
  scenarios.json
  saturation/
  inventory.json
  structured-draft.json
  checklist.json
  pack/
    manifest.json
    flow.json
    controls.json
    intents.json
    binders.json
    corpus.json
    glossary.json     # optional
    faq.json          # optional (+ packs/_base-en merge)
    lookups.json      # optional
  drafts/
  traces/
```

Scan / author / DAG tools update **only** this tree (JSON). They do not emit
application TypeScript learnings.

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

Core evaluates binders against `RuntimeContext.data` from the host’s `getContext()`.

## Coaching pattern (optional)

Default attribute: `data-guide-id="<id>"` (`config.json` → `guideAttr`).
Spotlight and flash only query this contract.

**UI-actions + host-injected catalogs:** `executeStep` resolves to path / modal /
spotlight / prefill. Pack `queries` / `mutations` / `tours` / `search` are matched
in core; hosts inject `resolveQuery` / `previewMutation` / `executeMutation` /
`runTour` / `openSearchHit`. The runtime must not import host API clients.

**Chrome:** brand FAB/chat via CSS variables (`appearance`), `notlm-*` classes, and
optional component slots. Pack JSON does not store brand colors.

Chat may attach **choice chips** for ambiguous utterances. Prefill / glossary /
FAQ / lookups / `userFill` sequential blink tours work as documented in the pack
cookbook.

### Optional ONNX / hybrid ranker

Default NLU is rule-based (`parseUtterance`). Hosts may ship `pack/ranker.json`
(+ optional `ranker.onnx`) and enable with `features.onnxRanker` or
`NOTLM_ONNX_RANKER=1`, passing `parseUtteranceFn` from `@notlm/ranker`.
Missing ONNX Runtime falls back to JSON inference.

### Laya decision fallback

- **Cold path:** host `fallbackLlm` → backend proxy → one Laya sidecar.
  Templates: `packages/ops/templates/laya/` (`notlmCLI laya install`).
  Default on when `features.layaDecisionFallback` is unset.
- **Secondary LLM** after Laya refuse: wire `secondaryFallbackLlm` and set
  `features.llmFallbackOnLayaMiss: true` (default off). Chaining lives in
  `@notlm/core`.
- **Hot path:** rules + optional `ranker.json` + session phrase LRU.
- **Mixed / OOD:** packed segments; repair copy with `{{entities}}` /
  `{{product_role}}`.
- Laya weight fine-tune is done offline with separate training tooling.

### Miss logging

Optional `missLog` transport persists portable `MissRecord`s for later tuning.
Built-ins: memory, `localStorage`, HTTP. NotLM never phones home unless the host
supplies a transport.

### MissExchange + decision fallback

When `fallbackLlm` is wired, misses can escalate to Laya (then optional LLM) and
log a `MissExchange`. Invalid `proposed.goto.stepId` values are forced to `refuse`.

Offline promotion of exchanges into pack drafts is out of scope for this repo.
After pack updates, run `notlmCLI intents check`. Provider SDKs are not part of
the operating runtime packages.

## Conversational behavior

Runtime stays deterministic. Conversational feel comes from:

- Repair banks (`repair.*` in `replies.json`)
- Confidence tiers on rule parse (`high` / `mid` / `low`)
- Discourse anaphora + light repair
- Gate policy — chat launches honor slots/confirm; packed/queue resume skips;
  proactive Yes skips confirm
- Optional `onCoachEvent` telemetry (no secrets)
- Optional miss logging and ranker hybrid
- Queue algebra and coach-create controls
- Context-tree shortlisting via pathname + availability

## SPA interactables

Pack controls declare stable `data-guide-id`s and a `role`. Orchestration fields
include `beforeOpen`, `openMenu`, `confirmDialog`, `spotlightOnly`, `draftKey`,
`wizardId` / `wizardPage`, `coachCreate` / `openModal`.

| Surface | Role |
|---------|------|
| Primary / secondary CTAs | `cta` |
| Form fields | `field` |
| Tabs | `tab` |
| Nav links | `nav` |
| Table / list rows | `row` |
| Drawers / sheets | `drawer` |
| Menus | `menu` |
| Confirm dialogs | `dialog` |
| Wizards | `step` |
| Combobox | `combobox` |
| File upload | `upload` |

Shared primitives: `clickGuide` / `createGuideNavigate`, draft bridge,
`runBeforeOpen`. Non-goals: toasts, skeletons, decorative icons, iframe internals.

## Voice

Optional Web Speech input when `features.voice` is on and the browser supports it.
No cloud STT / audio upload in the runtime.
