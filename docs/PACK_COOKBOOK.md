# Pack cookbook — wire up a UiPilot coach

**Audience:** developers adding UiPilot to a host SPA.  
**Goal:** ship a reviewable `.uipilot/pack/` by hand or after CLI drafts — not invent a new DSL.

Reference packs in this repo:

| Pack | Role |
|------|------|
| `packs/demo-todo/.uipilot/` | Smallest end-to-end example (start here) |
| `packs/demo-crm/.uipilot/` | Second host; same shapes |
| `packs/vb-director/.uipilot/` | Larger real-world DAG / corpus |
| `packs/_template/` | Empty schema fixture |

CLI operator loop (`map` / `tune` / `prepare`) is documented in `CONTRIBUTING.md`. This guide is the **human accept** path: what each JSON file means, and what must change in the host app.

---

## Mental model (five minutes)

```text
User says “add a todo” / picks a palette row
  → core matches an intent → step id
  → controls.json tells Host which data-guide-id to spotlight / click
  → Host navigate() activates that control (UI click only)
  → Host UI mutates state as a normal user would
  → getContext() + binders.json say whether the step is complete
  → optional: notifyStepCompleted(stepId) advances the coach queue
```

**Invariants**

- Runtime NLU is **deterministic** (aliases / corpus). No LLM on the chat hot path.
- Coach **never** calls your product APIs. It only navigates, spotlights, and activates annotated controls.
- All pack learnings live under **one folder** (default `.uipilot/`). Do not generate `guideIds.ts` as source of truth.

---

## Folder layout

```text
.uipilot/
  config.json                 # features, guideAttr (no secrets)
  checklist.json              # open gaps from map/author (optional to edit)
  scenarios.json              # labeled utterances for tune (optional)
  pack/
    manifest.json             # id, version, title, file refs
    flow.json                 # steps DAG
    controls.json             # guide ids ↔ steps ↔ nav/spotlight
    intents.json              # step aliases + meta intents
    binders.json              # completeness vs getContext().data
    corpus.json               # NLU regression cases (CI gate)
  drafts/                     # CLI/LLM proposals before --accept
```

Minimal mental model: **`manifest` + five pack files**. Everything else is tooling output.

Init:

```bash
uipilotCLI init ./my-app
```

Validate / corpus gate (run after every pack edit):

```bash
uipilotCLI intents check ./my-app
# or against a pack folder in this monorepo:
npm run check:demo
```

---

## Wire-up checklist (DoD for each step)

Copy this for every new step. A step is **not done** until all six are true.

| # | Task | Where |
|---|------|--------|
| 1 | Add the step to the DAG (`id`, `title`, `kind`, `requires`) | `pack/flow.json` |
| 2 | Bind completeness to live app state | `pack/binders.json` + `getContext()` |
| 3 | Map nav / spotlight to a stable guide id | `pack/controls.json` |
| 4 | Add clean aliases (+ slang/typos as you harden) | `pack/intents.json` |
| 5 | Add corpus cases (happy, slang, reject) | `pack/corpus.json` |
| 6 | Annotate host UI; wire navigate; call `notifyStepCompleted` on save when using the queue | Host app |

Host-only work (never put secrets or brand tokens in pack JSON):

1. Mount `UiPilotProvider` / `UiPilotHost` with `pack`, `getContext`, `navigate`.
2. Put `data-guide-id="…"` on the real buttons/fields the coach may activate (ids must match `controls.json`).
3. Implement `navigate(path)` so it finds that guide id and **clicks** (or focuses) it — same as a user.
4. Expose completeness fields on `getContext().data` that binders read.
5. On the save/confirm path that finishes a step, call `useUiPilot().notifyStepCompleted(stepId)` when you use the session queue.
6. Keep chrome look in React (`appearance` / CSS) — not in pack JSON.

---

## File-by-file guide

Examples below are trimmed from `packs/demo-todo`. Prefer **edit + diff** over blank-page authoring.

### `pack/manifest.json`

Identifies the pack and which files load.

```json
{
  "id": "demo-todo",
  "version": "0.0.0",
  "title": "Demo Todo coach",
  "features": { "chat": true, "palette": true, "spotlight": true, "voice": true },
  "files": {
    "flow": "flow.json",
    "controls": "controls.json",
    "intents": "intents.json",
    "binders": "binders.json",
    "corpus": "corpus.json"
  }
}
```

### `pack/flow.json`

Ordered job graph. Each step:

| Field | Required | Notes |
|-------|----------|--------|
| `id` | yes | Stable slug (`create_list`) — used everywhere else |
| `title` | yes | Human label in palette / chat |
| `kind` | yes | e.g. `hard` (must complete) / `soft` (optional) |
| `requires` | yes | Step ids that must be complete first (`[]` for roots) |
| `keywords` | no | Extra retrieval hints |
| `prefers` | no | Soft prerequisites |
| `hideWhen` | no | Hide when listed steps are complete |

```json
[
  {
    "id": "create_list",
    "title": "Create list",
    "keywords": ["list", "new list"],
    "kind": "hard",
    "requires": []
  },
  {
    "id": "add_item",
    "title": "Add item",
    "kind": "hard",
    "requires": ["create_list"]
  }
]
```

**Review tip:** keep `requires` acyclic. If the UI can be done out of order, prefer fewer hard edges.

### `pack/controls.json`

Bridges step → DOM anchor.

| Field | Notes |
|-------|--------|
| `id` | Must equal the host `data-guide-id` |
| `stepId` | Flow step this control finishes / opens |
| `path` | Passed to host `navigate()` (demos often use the guide id as the path token) |
| `spotlight` | Guide id to highlight (usually same as `id`) |
| `coachMessage` | Short chat copy after navigation |
| `role` | Optional (`cta`, `field`, `tab`, …) |

```json
[
  {
    "id": "guide-create-list",
    "role": "cta",
    "stepId": "create_list",
    "path": "guide-create-list",
    "spotlight": "guide-create-list",
    "coachMessage": "Click Create list — the coach only presses this button (no API)."
  }
]
```

Host button:

```tsx
<button type="button" data-guide-id="guide-create-list" onClick={createList}>
  Create list
</button>
```

### `pack/intents.json`

Deterministic aliases → step ids. `meta` lists built-in meta intents (e.g. `whats_next`, `go_back`).

```json
{
  "aliases": {
    "create_list": ["create list", "new list", "make a list"],
    "add_item": ["add item", "add todo", "add an item"]
  },
  "meta": ["whats_next", "go_back"]
}
```

Start with **clean** phrases. Add typos / STT fragments when hardening (see `vb-director`). Prefer `uipilotCLI tune` for large alias growth; keep hand edits for surgical fixes.

### `pack/binders.json`

Declares when a step is complete, evaluated against `getContext().data`.

| Shape | Example |
|-------|---------|
| Leaf | `{ "stepId": "create_list", "path": "data.listCount", "op": "gte", "value": 1 }` |
| Ops | `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `truthy`, `falsy` |
| Groups | nest `all` / `any` arrays of predicates |

```json
[
  { "stepId": "create_list", "path": "data.listCount", "op": "gte", "value": 1 },
  { "stepId": "add_item", "path": "data.itemCount", "op": "gte", "value": 1 }
]
```

Matching host context:

```ts
const getContext = () => ({
  pathname: '/',
  data: {
    listCount: lists.length,
    itemCount: items.length,
    completedCount: items.filter((i) => i.done).length,
  },
});
```

**Rule:** binder `path` must match keys you actually publish on `data`. Completeness is **not** authorization — your server still enforces authz.

### `pack/corpus.json`

Regression table for `intents check`. Every new alias family needs cases.

```json
[
  { "utterance": "create a list", "expect": { "stepId": "create_list" } },
  { "utterance": "add a todo", "expect": { "stepId": "add_item" } },
  { "utterance": "what's next", "expect": { "rawIntent": "whats_next" } },
  { "utterance": "go back", "expect": { "goBack": true } },
  { "utterance": "what's the weather", "expect": { "stepId": null } }
]
```

Suggested mix per step: **clean**, **slang**, **typo/truncated STT**, plus at least one **reject** (`stepId: null`) that must not steal the step.

---

## Day-1 walkthrough (smallest path)

1. **Init** `.uipilot/` (`uipilotCLI init` or copy `packs/demo-todo/.uipilot/pack/` and rename ids).
2. **Pick one job** (e.g. “create list”). Add one flow step, one control, one binder, 2–3 aliases, 3 corpus rows.
3. **Annotate** the real CTA with `data-guide-id` matching `controls[].id`.
4. **Mount** Host with `getContext` + `navigate` that clicks `[data-guide-id=…]`.
5. **Run** `uipilotCLI intents check` until green.
6. **Manual smoke:** type the utterance in chat; confirm spotlight + click; confirm binder flips when state updates.
7. **Only then** add the next step (`requires` the first).

Optional acceleration (still review before accept):

```bash
uipilotCLI map ./my-app
uipilotCLI tune ./my-app
# or: uipilotCLI prepare ./my-app --llm
uipilotCLI intents check ./my-app
uipilotCLI pack accept <draftId> ./my-app   # only when check is green
```

Drafts land under `.uipilot/drafts/` — treat them like a PR: read the diff, fix, then accept.

---

## Hand-edit vs CLI

| Do by hand | Prefer CLI / LLM draft |
|------------|-------------------------|
| First 1–3 steps while learning | Large alias / corpus growth |
| Fixing a wrong `requires` edge | Scenario saturation (`tune`) |
| Renaming a guide id (pack + DOM together) | Inventory crawl of a big screen |
| Binder path typos | Domain draft (`map --llm`) |

CLI never auto-merges into `pack/` without an explicit accept path. That is intentional.

---

## Common failures

| Symptom | Likely cause |
|---------|----------------|
| Utterance unmatched | Missing alias — or gibberish: coach offers next DAG steps from screen/flow instead of guessing |
| Chat works, UI does nothing | `navigate` does not click `data-guide-id`, or id mismatch |
| Coach asks “which one?” | Shared keyword across steps — reply with the step title, add a longer alias, or land on a page that biases the match |
| Queue pauses on a blocked step | Finish the named prerequisite (mid-queue inject); coach resumes the deferred step after it completes |
| Step always incomplete | Binder path ≠ `getContext().data` key, or op/value wrong |
| Step always available too early | Missing / weak `requires` |
| Coach “cheats” | Host called a product API from coach code — remove it; click UI instead |
| Check fails after `tune` | Accepting drafts without `intents check` green |

---

## Printable checklist

```text
[ ] manifest id/title set
[ ] flow: each step has id, title, kind, requires
[ ] controls: each step has a guide id; ids match DOM
[ ] intents: clean aliases for each step; meta listed if used
[ ] binders: each hard step has a predicate on getContext().data
[ ] corpus: clean + at least one reject case
[ ] glossary (optional): explain_field entries with guideId
[ ] Host: Provider/Host mounted; getContext; navigate clicks guides
[ ] Host: notifyStepCompleted on finishing saves (if using queue)
[ ] Host: field inputs annotated for prefill / explain flash
[ ] uipilotCLI annotate checklist  # merges host DoD into checklist.json
[ ] uipilotCLI intents check green
[ ] Manual chat/palette smoke on the happy path
```

---

## Record mode (happy-path → draft DAG)

1. `uipilotCLI trace new ./my-app` — creates an empty JSON under `.uipilot/traces/`.
2. Append click/navigate events (`guideId`, `url`, optional `text`) while walking the job.
3. `uipilotCLI trace ingest <trace.json> ./my-app` — writes a **low-confidence** flow/intents/corpus draft under `drafts/`.
4. Review requires edges; run `intents check`; accept only when green.

Record mode never auto-merges into `pack/`.

---

## Related docs

| Doc | Role |
|-----|------|
| `ARCHITECTURE.md` | Bundle boundaries, folder contract |
| `CONTRIBUTING.md` | Setup, `map` / `tune` / `prepare`, saturation |
| `SECURITY.md` | Secrets, BYO LLM, production checklist |
