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

## Build-time LLM (optional)

Runtime packages do not call LLMs. To draft a pack:

```bash
# after inventory + wa dag generate exist:
export WA_LLM_PROVIDER=ollama
export WA_LLM_BASE_URL=http://127.0.0.1:11434
export WA_LLM_MODEL=llama3.2
# wa pack author …   # lands in author-* slices
```

See `docs/adr/001-build-time-llm-author.md` and `SECURITY.md`.

See `tests/README.md`. Corpus changes are required when intents change.

## Commits

Conventional prefixes: `feat`, `fix`, `test`, `refactor`, `chore`, `docs`.  
Do not commit unless asked (agents) / keep slices ≈ commits when possible.
