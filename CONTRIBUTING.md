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

## Docs of record

Before coding: read `docs/PROGRESS.md`, then `docs/SLICE_BACKLOG.md`, then the relevant `docs/PLAN.md` section. Emit a Slice Plan per `.cursor/rules/typescript-slice-master.mdc`.

## Local CI

```bash
pnpm ci
# or
node scripts/ci/ci_check.mjs
```

## Packages

| Package | Role |
|---------|------|
| `@workflow-assistant/core` | Flow, session, NLU dispatch |
| `@workflow-assistant/react` | FAB, palette, spotlight, voice |
| `@workflow-assistant/schema` | Pack JSON Schema |
| `@workflow-assistant/codegen` | Emit TS from packs |
| `@workflow-assistant/mapper` | Playwright control inventory |
| `@workflow-assistant/author` | Build-time LLM pack drafts (BYO / Ollama / OpenAI-compat) |

## Host project layout

After install, developers manage **one folder** (default `.workflow-assistant/`):

```text
.workflow-assistant/
  config.json
  scenarios.json    # utterance → expected step/intent (intent tuning)
  inventory.json
  structured-draft.json
  checklist.json
  pack/{manifest,flow,controls,intents,binders,corpus}.json
  drafts/   traces/
```

Intent tuning: add scenarios, run `wa intents check` (deterministic CI). Optionally `wa intents tune` (LLM) to propose aliases/corpus, then `--accept` when check is green.

Scan / `dag generate` / LLM `pack author` only write JSON here (ADR-002). LLM keys stay in env, not in this folder.

See `docs/adr/001-build-time-llm-author.md`, `docs/adr/002-host-config-folder.md`, and `SECURITY.md`.

See `tests/README.md`. Corpus changes are required when intents change.

## Commits

Conventional prefixes: `feat`, `fix`, `test`, `refactor`, `chore`, `docs`.  
Do not commit unless asked (agents) / keep slices ≈ commits when possible.
