# ADR 010 — Action quarantine and conflict defer

## Status

Accepted (2026-10-19)

## Context

Live QA of host packs (e.g. Victory Bowling `vb-director`) showed systematic failures were **confident wrong routing** (how-to → open-by-name, format-apply → billing/subscription, ambiguous tokens → action chips), not missing FAQ copy. Repeated pack-phrase loops did not fix dispatch.

## Decision

1. **Mechanisms live in `@notlm/core`**: `ActionRisk`, `shouldDeferAction`, `conceptualActionConflict`, `scoresNearTie` / `risksConflict`, and `dispatchParsed` quarantine. Config-shaped (`AssistantFeatures.actionQuarantine`, `actionConfidenceFloor`, `treatMidAsLowForActions`, `conflictDelta`, `shadowActionDefer`). No host-brand strings in core.

2. **Generic linguistics SSOT**: platform `heuristicsDefaults.json` (conceptual how-to cues) + optional `notlm/packs/_base-en/routingConflict.json` (loaded by `loadFolder` → `LoadedPack.routingConflict`). Engines stay in TS; words/patterns in JSON. Host packs must **not** duplicate generic conceptual patterns — only product overlays (e.g. VB `deskHandoffPatterns`).

3. **Product-specific regressions** live as **test fixtures** (e.g. `react-frontend/.notlm/pack/routingRegression.json`), consumed by the vitest harness — not by `loadVbDirectorPack` / runtime pack load.

4. **Pass-through contract**: quarantine uses `pack.compiledHeuristics` (platform + overlay), not bare `DEFAULT_HEURISTICS`. `conflictDelta` comes from `features` → pack `routingConflict` → `DEFAULT_CONFLICT_DELTA`. Near-tie among step candidates uses `candidateScores` and skips auto `resolveKeywordCollision` when quarantine is on. Conceptual utterances also defer before **entity-lookup** hit/miss/ambiguous (parse-time risk is often `unknown`/`clarify`, which would otherwise bypass the navigate gate).

5. **Widen Laya share via mid-as-low for actions and conflict defer** — not a blunt global 15/85 NLU/Laya traffic split.

6. **Out of scope for this ADR**: multi-Laya specialist weight trees / router-of-Layas; Laya promote CI/CD; host synonym banks in TypeScript; `if (pack.id === 'vb-…')` in core.

## Consequences

- FAQ/answer paths remain pack-hot when confidence is high and risk is `answer`.
- Navigate/mutate below the action floor, or conceptual utterances parsed as goto/mutate without FAQ/query heads, emit `low_confidence` and defer to Laya when `deferLowConfidenceToFallback` is on.
- Hosts wire flags (VB: `DirectorGuideHost` + `VITE_NOTLM_*` env knobs).
- Future specialist Laya heads may attach later; they are not required to ship quarantine.

## Follow-up (2026-10-19) — ConfirmSession / action plane

Quarantine alone does not stop **confident wrong targets**. Format-apply confirms must
**freeze opaque `eventId` / `tournamentId` at propose** (`confirmSession.ts` +
`pendingDraftApply` / unified `ActionIntent`). Yes injects those ids into the draft;
hosts must not re-resolve by fuzzy name. Scoped lists use tournament-filtered APIs
(`tournament_id_filter`). Ambiguous scoped names store `pendingDraftApplyPick` and
ask for a **numbered** reply before the Yes/Cancel confirm. Host
`needsConfirm: false` is an explicit veto of pack `risk=high` / `confirmPrompt`
(e.g. USBC assign → Actions Needed; tournament delete → page Confirm dialog only).
Typo-corrected strong FAQ runs **before** Clear-OOD so near-miss how-tos never refuse.
Ship gate: host `actionPlaneFixtures.json` + `npm run test:action-plane` asserting
**target id** and write-fired / Cancel-no-write — not FAQ copy.
