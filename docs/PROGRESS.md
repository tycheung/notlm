# PROGRESS

## Current

- **G5d / G5e / G10 implementation: DONE** (saturation + CLI façade + chrome personalization)
- Publish (`publish-*`) intentionally deferred

## Last completed

- Steward pass: deleted dead `stubDispatch` (−~90 LOC); demo-crm + accent Playwright (7 e2e green)
- **sat-014 / sat-015** — no-lift stop (5×100) + `--force=N` hard augment
- **P4d–P4f** saturation, CLI façade, chrome personalization
- Unit: 84/84; Playwright demo-todo+crm: **7/7**

## Next (optional)

1. CI coverage floors / module-size gates (`ci-002`…)
2. Live LLM integration pass for `scenarios generate` / `tune` (BYO keys)
3. **npm publish** when explicitly requested

## Goal check (PLAN G1–G10)

| Goal | Status |
|------|--------|
| G1 Installable packages | **Done** (workspaces; publish deferred) |
| G2 Generic Core + Host | **Done** |
| G3/G3b Pack JSON folder | **Done** |
| G4 Mapper inventory | **Done** |
| G5 Process authoring assist | **Done** |
| G5b Build-time LLM author | **Done** |
| G5c Intent tune | **Done** |
| G5d Scenario saturation + orthogonality | **Done** |
| G5e Operator CLI façade | **Done** (`map` / `tune` / `prepare`) |
| G6 VB parity path | **Done** |
| G7 Quality gates | **Done** (+ `@guide-saturate` opt-in) |
| G8 Feature flags | **Done** |
| G9 UI-actions only | **Done** |
| G10 Host chrome personalization | **Done** |

## Notes

- Prefer `UIPILOT_SATURATE_FIXTURE=1` or `--batch=5` when using npm (flags often stripped on Windows).
- Saturation artifacts under `.uipilot/saturation/` and `drafts/` are gitignored.
- Real Victory Bowling app not modified; use `sandboxes/vb-frontend`.
