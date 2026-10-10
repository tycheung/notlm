# Pack template (JSON-only)

Mirrors the host install folder. On a real app, `notlmCLI init` creates `.notlm/` with
the same files (`config.json` at home root; pack files under `pack/`).

This repo keeps a copy under `packs/_template/` for schema fixtures.

Host authors: see **`docs/PACK_COOKBOOK.md`** for the wire-up checklist and field guide.

Optional semantic retrieve artifacts (host-owned, not required in the template):

- `pack/semantic-index.json` — base (regenerate with `notlm-training pack embed-index`)
- `pack/semantic-index.custom.json` — custom overlay (never overwritten by embed-index)
