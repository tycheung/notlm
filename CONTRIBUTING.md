# Contributing

## Setup

```bash
npm install
# or: pnpm install / yarn (workspaces supported)
npm run typecheck
npm test
npm run lint
```

Requires Node ≥ 20. Prefer **pnpm** when available (`pnpm-workspace.yaml` is present); **npm workspaces** work out of the box via root `package.json`.

## Local CI

```bash
pnpm ci
# or
node scripts/ci/ci_check.mjs
# PR / CI (includes Playwright demo smoke):
node scripts/ci/ci_check.mjs --with-e2e
# optional saturation fixture + @guide-saturate e2e:
node scripts/ci/ci_check.mjs --with-saturation
```

Default local gate: lint + typecheck + unit + `intents check` (demo-todo).
`--with-e2e` (or `CI=true`) also runs demo Playwright projects.

### Saturation stop rule (when to stop generating)

`uipilotCLI scenarios saturate` / `tune` score each batch’s **incremental novelty**
(lexical n-gram distance + parse-signature rarity) vs the prior pool.

Stops when either:

1. **Classic plateau** — consecutive batches fall below ε (default 0.15) for K batches
   (default 2) on combined novelty, or
2. **No-lift hard stop** — **5 consecutive passes of 100** show **no lift** on
   parse-signature / intent-border novelty (even if wording still looks very
   different / high lexical novelty).

Review `saturation/novelty-report.json`, mine failures under `drafts/`, run
`intents check`, then `pack accept` only when green.

**Hard augment (ignore similarity):**

```bash
# Emit exactly 10000 candidates; do not stop on novelty / plateau
uipilotCLI tune ./my-app --force=10000
uipilotCLI scenarios generate ./my-app --force=10000
# aliases: --hard=10000
```

Fixture mode (no LLM): add `--fixture` or `UIPILOT_SATURATE_FIXTURE=1`.
Tip: npm may strip `--flags`; prefer `--force=10000` / `--batch=100` form.

## Packages

| Package | Role |
|---------|------|
| `@uipilot/core` | Flow, session, NLU dispatch |
| `@uipilot/react` | FAB, palette, spotlight, voice |
| `@uipilot/schema` | Pack JSON Schema |
| `@uipilot/codegen` | Emit TS from packs |
| `@uipilot/mapper` | Playwright control inventory |
| `@uipilot/author` | Build-time LLM pack drafts (BYO / Ollama / OpenAI-compat) |
| `@uipilot/ranker` | Optional corpus-trained intent+slot ranker (JSON / lazy ONNX) |

## Pack cookbook (start here for hosts)

Human wire-up guide — what each pack JSON file means, the per-step checklist
(`flow` → binders → controls → intents → corpus → host annotations), and when to
hand-edit vs run `map` / `tune` / `prepare`:

→ **[`docs/PACK_COOKBOOK.md`](docs/PACK_COOKBOOK.md)**

Also see `ARCHITECTURE.md` and `SECURITY.md`.

## Host project layout

After install, developers manage **one folder** (default `.uipilot/`):

```text
.uipilot/
  config.json
  scenarios.json    # utterance → expected step/intent (intent tuning)
  saturation/       # candidate batches + novelty reports
  inventory.json
  structured-draft.json
  checklist.json
  pack/{manifest,flow,controls,intents,binders,corpus}.json
  drafts/   traces/
```

### Dev install → train → personalize

```bash
npm i @uipilot/core @uipilot/react
# CLI for authoring (workspace / published binary as available)
uipilotCLI init ./my-app
uipilotCLI prepare ./my-app --llm    # or map / tune separately
```

Then mount the Host and brand the chrome:

```ts
<UiPilotProvider
  pack={pack}
  getContext={getContext}
  navigate={navigate}
  appearance={{ accent: '#0f766e', radius: '12px' }}
  className="my-coach"
  // components={{ FabButton: MyFab }}  // optional full replace
>
  <App />
  <UiPilotHost />
</UiPilotProvider>
```

Layers: (1) override `uipilot-*` classes, (2) `appearance` → CSS variables, (3) `components` slots.
Appearance is **host app** concern — not stored in `.uipilot/pack/*.json`.

### Operator loop (primary CLI)

Three phases over a codebase:

1. **Domain** — what the product/jobs are (`map --llm` or `pack author`)
2. **Map** — DAG of ops + controls (`uipilotCLI map`)
3. **Tune** — generate examples, fine-tune intents, correct DAG (`uipilotCLI tune`)

```bash
uipilotCLI map ./my-app              # mechanical map only
uipilotCLI tune ./my-app             # examples + intent/DAG correction drafts
uipilotCLI tune ./my-app --force=10000  # hard-add exactly 10000 (ignore similarity)
uipilotCLI prepare ./my-app          # map then tune
uipilotCLI prepare ./my-app --llm    # domain-aware map, then tune
uipilotCLI pack accept <draftId> ./my-app
uipilotCLI intents check ./my-app    # deterministic CI gate
```

Atomic commands (`inventory crawl`, `dag generate`, `pack author`, `intents tune`,
`scenarios saturate`, …) remain for power users and are what `map`/`tune`/`prepare`
compose.

Intent tuning: add or generate scenarios, run `uipilotCLI intents check` (deterministic CI).
`tune` / `intents tune` propose aliases/corpus under `drafts/`; `--accept` only when check is green.

Scan / `map` / LLM author only write JSON under `.uipilot/`. LLM keys stay in env, not in this folder.

See `tests/README.md`. Corpus changes are required when intents change.

## Commits

Conventional prefixes: `feat`, `fix`, `test`, `refactor`, `chore`, `docs`.
