# demo-todo pack

Portability proof pack for the todo coach demo (`apps/demo-todo`).

Source of truth is the host-style folder under `.uipilot/` (manifest, flow, controls,
intents, binders, corpus, scenarios).

Runtime loads these JSON pieces via `loadPackFromJson` — no generated TypeScript pack code.

### Operating gates

```bash
npm run build
npm run uipilotCLI -- validate packs/demo-todo
npm run uipilotCLI -- intents check packs/demo-todo
npm run uipilotCLI -- ranker check packs/demo-todo
```
