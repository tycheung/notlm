# Sandboxes

Scratch copies of host apps used **only** for pack extraction and local experiments
inside this monorepo. **Not** npm workspaces — outside root `eslint packages apps`
and not part of the runtime package graph.

## `vb-frontend`

This is a **COPY** of the Victory Bowling `react-frontend` tree for testing pack extract /
inventory tooling. Optional; not required for thin `uipilotCLI` gates.

| Do | Don't |
|----|--------|
| Re-run extract scripts against this copy | Modify the **real** Victory Bowling `react-frontend` from this work |
| Treat pack output under `packs/vb-director/` as the portable artifact | Commit product features into the sandbox as if it were the source of truth |
| Use `uipilotCLI intents check` to gate the extracted pack | Couple `@uipilot/core` to VB API clients |

### Re-extract the VB director pack

From the **uipilot** repo root (after `npm install`):

```bash
npm run extract:vb
```

This runs `node scripts/extract-vb-pack.mjs`, which reads **only** `sandboxes/vb-frontend`
and writes JSON under `packs/vb-director/.uipilot/`.

### Intents check (deterministic, no LLM)

```bash
npm run build   # once, so packages/cli/dist is current
npm run check:vb
```

Offline pack authoring is out of scope for this repo.
