# demo-todo pack

Portability proof pack for the todo coach demo (`apps/demo-todo`).

Source of truth is the host-style folder under `.notlm/` (manifest, flow, controls,
intents, binders, corpus, scenarios).

Runtime loads these JSON pieces via `loadPackFromJson` — no generated TypeScript pack code.

### Operating gates

```bash
npm run build
npm run notlmCLI -- validate packs/demo-todo
npm run notlmCLI -- intents check packs/demo-todo
npm run notlmCLI -- ranker check packs/demo-todo
```
