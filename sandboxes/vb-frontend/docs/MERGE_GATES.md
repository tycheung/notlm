# Merge gates (vibe-ship)

Mechanical checks that replace steward-only catching after Bob/Cursor ships.

## Required CI jobs

| Job id | What it enforces |
|--------|------------------|
| `vibe-ship-invariants` | No client engines, print window contract, PR handoff body, god-component gate |

The main `frontend` job still runs lint/tests/e2e. Treat **`vibe-ship-invariants` red as merge-blocking**.

## Local before opening a PR

```bash
npm run check:vibe-ship
npm run check:god-components
```

## Branch protection (GitHub Pro / public)

Private repos on the free org plan cannot enable classic branch protection or rulesets (HTTP 403). When available, require on `main`:

1. `vibe-ship-invariants`
2. `frontend`

Until then: do not merge red `vibe-ship-invariants` PRs; avoid push-to-main bypasses for feature work.

## Emergency

`SKIP_PR_HANDOFF=1` skips only the PR body checker. Do not use for feature ships.
