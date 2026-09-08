# Sandboxes

Scratch copies of host apps used **only** for pack extraction and local experiments inside this monorepo.

## `vb-frontend`

This is a **COPY** of the Victory Bowling `react-frontend` tree for testing pack extract / inventory tooling.

| Do | Don't |
|----|--------|
| Re-run extract scripts against this copy | Modify the **real** Victory Bowling `react-frontend` from this assistant work |
| Treat pack output under `packs/vb-director/` as the portable artifact | Commit product features into the sandbox as if it were the source of truth |
| Use intents check to gate the extracted pack | Couple `@uipilot/core` to VB API clients |

### Re-extract the VB director pack

From the `assistant/` repo root (after `npm install`):

```bash
npm run extract:vb
```

This runs `node scripts/extract-vb-pack.mjs`, which reads **only** `sandboxes/vb-frontend` and writes JSON under `packs/vb-director/.uipilot/`. It does not touch paths outside `assistant/`.

### Intents check (deterministic, no LLM)

```bash
npm run build   # once, so packages/cli/dist is current
npm run check:vb
```

Equivalent:

```bash
npm run uipilotCLI -- intents check packs/vb-director
```

Expect all scenarios in `packs/vb-director/.uipilot/scenarios.json` to PASS.

### Demo packs

```bash
npm run check:demo
```

Checks `packs/demo-todo` scenarios the same way.
