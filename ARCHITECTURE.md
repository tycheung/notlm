# Architecture

## Layers

```text
host-app/
  .uipilot/     → ALL config + scan/author learnings (JSON only)
  src/…                    → getContext, data-guide-id, notifyStepCompleted

npm: @uipilot/react  → UI Host (depends on core)
npm: @uipilot/core   → pure TS runtime; loads/evaluates pack JSON
npm: @uipilot/schema → JSON Schema for the folder format + miss/exchange wire
npm: @uipilot/ranker → optional ONNX/hybrid infer (prebuilt artifacts only)
CLI: init / validate / intents check / ranker check (thin gates only)
```


### Import rules

- `core` must not import `react`, `mapper`, `author`, `@uipilot/llm`, or host app code.
- `react` may import `core` only — **never** `author`, `mapper`, or `@uipilot/llm`.
- Offline tooling may write **files** under `.uipilot/`, not TS into host `src/` — that tooling is out of scope for this repo.
- Host BYO `fallbackLlm` is a host-owned HTTP proxy — **not** a provider SDK in the browser (or in the operating runtime packages).
- Default unit CI must not require a live LLM.

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

**User-ask / saturation growth** of scenarios and FAQ is done offline (out of scope
for this repo). Ship updated `scenarios.json` / pack pieces, then run
`uipilotCLI intents check`.

### Optional ONNX intent+slot ranker

Default NLU remains rule-based (`parseUtterance`). Hosts may opt into a
corpus-trained tiny hashed-ngram ranker:

1. Ship `pack/ranker.json` (+ optional `pack/ranker.onnx`) as host artifacts
2. Enable with `features.onnxRanker: true` or `UIPILOT_ONNX_RANKER=1`
3. Pass `parseUtteranceFn` from `@uipilot/ranker` (`createJsonHybridParser` /
   `createHybridUtteranceParser` with prebuilt ONNX bytes — never synthesized here)

`onnxruntime-node` / `onnxruntime-web` are **optional peers** — missing ORT falls
back to pure-TS JSON inference. Low-confidence ranker scores fall back to rules.

### Optional miss logging (intent tuning)

When the coach cannot understand an utterance (`unknown` / `ambiguous` /
`low_confidence`), hosts may persist a portable `MissRecord` for later alias /
corpus / typo-lexicon tuning:

```tsx
import { createLocalStorageMissLogTransport } from '@uipilot/core';

missLog={{
  transport: createLocalStorageMissLogTransport({ key: 'uipilot:misses' }),
  packId: 'demo-todo',
}}
```

Built-in transports: memory, `localStorage`, `createHttpMissLogTransport({ url })`.
Offline recalibration of misses / exchanges is **out of scope** for this repo.
UiPilot never phones home unless the host supplies an HTTP transport.

#### HTTP Miss Sink Contract

Hosts that implement an HTTP miss sink **must** use the portable `MissRecord`
shape on **both** ingest and list/export. SQL column names are a host concern;
the JSON wire format is not.

```ts
type MissRecord = {
  text: string;                 // capped (~500)
  kind: 'unknown' | 'ambiguous' | 'low_confidence';
  packId?: string;
  pathname?: string;
  rawIntent?: string | null;
  confidence?: 'high' | 'mid' | 'low';
  at: string;                   // ISO timestamp
};
```

| Direction | Body |
|-----------|------|
| `POST` (ingest) | one `MissRecord` |
| `GET` / export | `MissRecord[]` (JSON) or JSONL of the same |

Host-only admin fields (`id`, `userId`, `consumedAt`, `createdAt`, …) may appear
as **additional camelCase properties**. Snake_case aliases (`utterance`,
`pack_id`, `client_at`, …) are **rejected** by `parseMissRecords`
so corpus tuning stays on-contract.
Schemas: `@uipilot/schema` `missRecordSchema` / `missRecordListSchema`.

#### Conversation logging (hits + misses)

Hosts may also wire a **conversation** transcript sink. One `conversationId` is
minted per `UiPilotProvider` mount; append-only `ConversationTurn`s cover user and
assistant chat plus structured outcomes (`hit` / `miss` / `blocked` / `confirm` /
`slot_ask` / `adapter`). Kill switch: `features.conversationLog === false`.

```tsx
import { createHttpConversationTransport } from '@uipilot/core';

conversationLog={{
  transport: createHttpConversationTransport({ url: '/api/uipilot/conversations' }),
  packId: 'demo-todo',
}}
```

```ts
type ConversationTurn = {
  conversationId: string;
  turnId: string;
  at: string;
  role: 'user' | 'assistant';
  text: string;                 // user ~500, assistant ~2000
  outcome?: 'hit' | 'miss' | 'blocked' | 'confirm' | 'slot_ask' | 'adapter';
  stepId?: string;
  missKind?: 'unknown' | 'ambiguous' | 'low_confidence' | 'blocked';
  rawIntent?: string | null;
  confidence?: 'high' | 'mid' | 'low';
  pathname?: string;
  packId?: string;
};
```

| Direction | Body |
|-----------|------|
| `POST` (ingest) | one `ConversationTurn` |
| `GET` / export | `ConversationRecord[]` or flat `ConversationTurn[]` (hosts / offline tooling aggregate by id) |

Snake_case keys are rejected by parse helpers. Offline LLM analysis of conversations
is **out of scope** for this repo (external pack tooling). Existing `MissRecord` /
`MissExchange` sinks remain supported.

#### MissExchange + Learning Mode (1A)

**Production default = Learning Mode OFF** (`features.learningMode` unset/false).
Offline NLU only; miss → canned repair. No LLM required.

**Train window:** set `features.learningMode: true` and pass host `fallbackLlm`
(BYO server proxy). Misses escalate to LLM → chat reply → **`MissExchange`** log.
Invalid `proposed.goto.stepId` values are forced to `refuse` (no fake step chips).

Offline promotion of exchanges into pack drafts is **out of scope** for this repo
(host / external pack tooling). After pack pieces and `scenarios.json` update,
run `uipilotCLI intents check`, then freeze Learning Mode when coverage is high
enough.

Host coverage API (e.g. VB): `GET …/uipilot/misses/metrics` → `fallbackShare`,
optional `localHitRate`, `recommendFreeze`.

Drafts only → human / `intents check` accept (ADR-009). Then **freeze**: turn
Learning Mode off; local NLU owns traffic. Provider SDKs are not part of the
operating runtime packages.

## Conversational maturity (G11 / ADR-008)

Runtime stays deterministic. LLM-*feel* comes from:

- **Repair banks** (`repair.*` in `replies.json`) for blocked / ambiguous / unknown / low-confidence
- **Confidence tiers** on rule parse (`high` / `mid` / `low`) — low asks before acting
- **Discourse** anaphora + light repair (“again”, “change the name”, “undo that”)
- **Gate policy** — chat launches honor slots/confirm; packed/queue/`executeStep` resume skip; proactive Yes skips confirm (ADR-008)
- **Telemetry** — optional `onCoachEvent` for hosts (intent/pending/blocked/launched; no secrets)
- **Miss logging** — optional `missLog={{ transport }}` for unknown/ambiguous/low-confidence utterances (memory / localStorage / HTTP)
- **Optional ranker** — demo-todo may enable JSON/ORT hybrid via `features.onnxRanker` / env
- **Queue algebra** — head-stable merge, rewrite (clear / skip / cancel X / jump Y), packed prereq expansion
- **Coach-create** — `controls[].coachCreate` (+ `openModal`) re-opens forms on re-ask; slot elicit + multi-slot salvage
- **Context-tree NLU** — authoring auto-detects muddy alias clashes and splits saturation
  batches into reduced focus sets (`.uipilot/saturation/context-tree.json`); runtime
  shortlists via pathname + availability (`shortlistStepIds` / `filterCandidatesByContext`)

## SPA interactables (coach target taxonomy)

Beyond pages + create/edit modals, pack controls declare stable `data-guide-id`s
and a `role`. Runtime honors orchestration fields on `controls` / `NavResolve`:
`beforeOpen`, `openMenu`, `confirmDialog`, `spotlightOnly`, `draftKey`,
`wizardId` / `wizardPage`, `coachCreate` / `openModal` (drawer/sheet).

| Surface | Role | Notes |
|---------|------|-------|
| Primary / secondary CTAs | `cta` | Save, submit, continue; `do_it` launches queue head |
| Form fields | `field` | Prefer `userFill` for PII; draft via `draftKey` + `useDraftBridge` |
| Tabs / segmented controls | `tab` | `beforeOpen` / path click switches pane before fields |
| Nav links / sidebars | `nav` | Route via `createGuideNavigate` click — not silent `history.push` |
| Table / list rows | `row` | Lookup hit flashes + clicks `guideIdTemplate` |
| Drawers / sheets | `drawer` | Same `openModal` + `useGuideModal` bridge as modals |
| Menus / popovers | `menu` | `openMenu` then nested item (`beforeOpen` / path) |
| Dialogs (confirm) | `dialog` | `confirmDialog` guide id — distinct from chat confirm gate |
| Wizards / steppers | `step` | One flow step per wizard page (`wizardId` + `wizardPage`) |
| Combobox / typeahead | `combobox` | Spotlight-only by default — no auto-pick |
| File upload | `upload` | Never auto-upload; `spotlightOnly` |
| Empty states / gated CTAs | `cta` | Availability via binders + `hideWhen` |

Shared primitives: `clickGuide` / `createGuideNavigate`, `readDraft`/`writeDraft` /
`useDraftBridge`, `runBeforeOpen`. Non-goals: toasts, skeletons, decorative icons,
raw canvas ink, iframe internals (host must bridge).

## Voice

`packages/react` Web Speech wrapper only. Product policy: Chrome / Edge / Safari; Firefox type-only; no cloud STT.
Corpus includes truncated-STT utterances; Playwright Firefox project is type-only smoke.
