# Contributing

## Setup

```bash
npm install
npm run build
npm run typecheck
npm test
npm run lint
```

Requires Node ≥ 20. Prefer **pnpm** when available (`pnpm-workspace.yaml` is present); **npm workspaces** work out of the box via root `package.json`.

## Local CI

`dist/` is gitignored — `ci_check` runs **`npm run build` first**, then lint / typecheck /
coverage / pack gates.

```bash
npm run ci
# or
node scripts/ci/ci_check.mjs
# PR / CI (includes Playwright demo smoke):
node scripts/ci/ci_check.mjs --with-e2e
```

Default local gate: build + lint + typecheck + unit + `validate` / `intents check` /
`ranker check` (demo-todo). `--with-e2e` (or `CI=true`) also runs demo Playwright.

## Packages (operating / runtime)

| Package | Role |
|---------|------|
| `@notlm/core` | Flow, session, NLU dispatch |
| `@notlm/react` | FAB, palette, spotlight, voice |
| `@notlm/schema` | Pack JSON Schema |
| `@notlm/ranker` | Optional corpus-trained intent+slot **infer** (JSON / prebuilt ONNX bytes) |
| `@notlm/cli` | Thin gates: `init` / `validate` / `intents check` / `ranker check` |

Offline pack authoring and model training are **out of scope** for this repo. Ship
updated pack JSON / `ranker.json` (+ optional `ranker.onnx`) as host artifacts, then
re-run `notlmCLI intents check` / `ranker check`.

## Pack cookbook (start here for hosts)

Human wire-up guide — what each pack JSON file means and the per-step checklist:

→ **[`docs/PACK_COOKBOOK.md`](docs/PACK_COOKBOOK.md)**

Also see `ARCHITECTURE.md` and `SECURITY.md`.

## Host project layout

```text
.notlm/
  config.json
  scenarios.json    # utterance → expected step/intent (intent check gate)
  pack/{manifest,flow,controls,intents,binders,corpus}.json
  drafts/   traces/   # optional host/offline tooling output
```

### Dev install → personalize

```bash
npm i @notlm/core @notlm/react
notlmCLI init ./my-app
notlmCLI intents check ./my-app
```

Then mount the Host and brand the chrome:

```ts
<NotLMProvider
  pack={pack}
  getContext={getContext}
  navigate={navigate}
  appearance={{ accent: '#0f766e', radius: '12px' }}
  className="my-coach"
>
  <App />
  <NotLMHost />
</NotLMProvider>
```

Layers: (1) override `notlm-*` classes, (2) `appearance` → CSS variables, (3) `components` slots.
Appearance is **host app** concern — not stored in `.notlm/pack/*.json`.

See `tests/README.md`. Corpus / scenario changes are required when intents change.

## Commits

Conventional prefixes: `feat`, `fix`, `test`, `refactor`, `chore`, `docs`.
