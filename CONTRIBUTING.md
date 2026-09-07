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

## Tests

See `tests/README.md`. Corpus changes are required when intents change.

## Commits

Conventional prefixes: `feat`, `fix`, `test`, `refactor`, `chore`, `docs`.  
Do not commit unless asked (agents) / keep slices ≈ commits when possible.
