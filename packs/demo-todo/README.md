# demo-todo pack

Portability proof pack for the todo coach demo (`apps/demo-todo`).

Source of truth is the host-style folder:

```text
.uipilot/
  config.json
  scenarios.json          (≥9 labeled cases)
  binders.json            (root mirror)
  corpus.json             (root mirror)
  pack/
    manifest.json
    flow.json
    controls.json
    intents.json
    binders.json
    corpus.json
```

Runtime loads these JSON pieces via `loadPackFromJson` — no generated TypeScript pack code.

### Saturation fixture

```bash
npm run build
npm run uipilotCLI -- scenarios saturate packs/demo-todo --fixture --batch 5 --max-batches 3
npm run test:e2e:demo -- --grep @guide-saturate
```

`--fixture` needs no LLM. Live generate uses `UIPILOT_LLM_*` env (ADR-001).
