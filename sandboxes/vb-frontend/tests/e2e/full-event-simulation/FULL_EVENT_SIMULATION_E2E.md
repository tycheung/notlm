# Full Event Simulation E2E — Living Ledger

> **Goal:** Playwright full end-to-end event simulations covering Event Info, Participant Management, Squads, and Game Scoring (excluding Lane Assignments and Side Action). Each bundle is a 2-stage event (qualifying eliminator → method-specific final) with ≥120 entrants.

**Status legend (per bundle):**
`not_started` → `scaffolded` → `tests_written` → `running` → `bugs_fixing` → `passing` → `committed` → (after all bundles) `final_commit`

**Last updated:** 2026-07-30

**Test directory:** [`react-frontend/tests/e2e/full-event-simulation/`](react-frontend/tests/e2e/full-event-simulation/)

**Run:** `npm run test:e2e:full-event-sim` (requires `PW_E2E_TD_*` + `PW_E2E_API_URL`; tagged `@fullflow` + `@full-event-sim`, excluded from CI smoke via `--grep-invert @fullflow`)

---

## Progress at a glance

| Epic | Bundle | Format | Entrants | Final method | Status | GH Issue | FE commit | BE commit | Notes |
|------|--------|--------|----------|--------------|--------|----------|-----------|-----------|-------|
| E1 | Singles Qual→Elim | singles | 120 bowlers | eliminator | `committed` | [#12](https://github.com/VictoryBowlingSoftware/react-frontend/issues/12) | `822bb2d` | `47928fa` | Passed |
| E2 | Singles Qual→Bracket | singles | 120 bowlers | bracket (SE) | `committed` | [#13](https://github.com/VictoryBowlingSoftware/react-frontend/issues/13) | `822bb2d` | `47928fa` | Passed |
| E3 | Singles Qual→DoubleElim | singles | 120 bowlers | bracket (DE) | `committed` | [#14](https://github.com/VictoryBowlingSoftware/react-frontend/issues/14) | `822bb2d` | `715967c` | FK wipe fix |
| E4 | Singles Qual→Stepladder | singles | 120 bowlers | stepladder | `committed` | [#15](https://github.com/VictoryBowlingSoftware/react-frontend/issues/15) | `822bb2d` | `715967c` | Passed |
| E5 | Singles Qual→RoundRobin | singles | 120 bowlers | round_robin | `committed` | [#16](https://github.com/VictoryBowlingSoftware/react-frontend/issues/16) | `d708da5` | `715967c` | RR config fix |
| E6 | Singles Qual→Pods | singles | 120 bowlers | pods | `committed` | [#17](https://github.com/VictoryBowlingSoftware/react-frontend/issues/17) | `d708da5` | `715967c` | Passed |
| E7 | Teams Qual→Elim | teams | 120 teams (size 2–5) | eliminator | `committed` | [#18](https://github.com/VictoryBowlingSoftware/react-frontend/issues/18) | `e6ef36d` | `715967c` | Team assign + scoring_mode |
| E8 | Teams Qual→Bracket | teams | 120 teams (size 2–5) | bracket (SE) | `committed` | [#19](https://github.com/VictoryBowlingSoftware/react-frontend/issues/19) | `e6ef36d` | `715967c` | Passed (~13.6m) |
| E9 | Teams Qual→DoubleElim | teams | 120 teams (size 2–5) | bracket (DE) | `committed` | [#20](https://github.com/VictoryBowlingSoftware/react-frontend/issues/20) | `e6ef36d` | `715967c` | Passed |
| E10 | Teams Qual→Stepladder | teams | 120 teams (size 2–5) | stepladder | `committed` | [#21](https://github.com/VictoryBowlingSoftware/react-frontend/issues/21) | `e6ef36d` | `715967c` | Passed |
| E11 | Teams Qual→RoundRobin | teams | 120 teams (size 2–5) | round_robin | `committed` | [#22](https://github.com/VictoryBowlingSoftware/react-frontend/issues/22) | `e6ef36d` | `715967c` | Passed |
| E12 | Teams Qual→Pods | teams | 120 teams (size 2–5) | pods | `committed` | [#23](https://github.com/VictoryBowlingSoftware/react-frontend/issues/23) | `e6ef36d` | `715967c` | Passed |
| FINAL | All `@full-event-sim` | — | — | — | `final_commit` | — | `5c5c4ed` | `89b8ccd` | **12/12 passed** (~26m) scoring coverage |

---

## Epic details

### E1 — Singles Qualifying → Eliminator final
- Spec: `singles/e1-elim-to-elim.spec.ts`
- Acceptance: create event, setup prizes/flow, register 120, edit paid/checked-in, squads+lock, score qual, advance, score final, assert payouts UI

### E2 — Singles Qualifying → Single-elim bracket
- Spec: `singles/e2-elim-to-bracket.spec.ts`

### E3 — Singles Qualifying → Double-elim bracket
- Spec: `singles/e3-elim-to-double-elim.spec.ts`

### E4 — Singles Qualifying → Stepladder
- Spec: `singles/e4-elim-to-stepladder.spec.ts`

### E5 — Singles Qualifying → Round robin
- Spec: `singles/e5-elim-to-round-robin.spec.ts`

### E6 — Singles Qualifying → Pods
- Spec: `singles/e6-elim-to-pods.spec.ts`

### E7 — Teams Qualifying → Eliminator final
- Spec: `teams/e7-elim-to-elim.spec.ts`
- 120 teams; member counts randomly 2–5; event `team_size=5`

### E8 — Teams Qualifying → Single-elim bracket
- Spec: `teams/e8-elim-to-bracket.spec.ts`

### E9 — Teams Qualifying → Double-elim bracket
- Spec: `teams/e9-elim-to-double-elim.spec.ts`

### E10 — Teams Qualifying → Stepladder
- Spec: `teams/e10-elim-to-stepladder.spec.ts`

### E11 — Teams Qualifying → Round robin
- Spec: `teams/e11-elim-to-round-robin.spec.ts`

### E12 — Teams Qualifying → Pods
- Spec: `teams/e12-elim-to-pods.spec.ts`

---

## Bug log

| Date | Epic | Area (FE/BE) | Symptom | Fix | Commit |
|------|------|--------------|---------|-----|--------|
| 2026-07-29 | E1+ | BE | Local DEBUG CORS / cookie / Redis live-publish hangs blocked scoring | DEBUG CORS headers; non-secure cookies; Redis publish fail-fast | `47928fa` (BE) |
| 2026-07-29 | E3 | BE | FK violation wiping unscored match series during qual CSV import | Delete games before wiping match-series shells | `715967c` (BE) |
| 2026-07-29 | E5 | FE | Template apply 500 — invalid `bonus_pins` on round_robin config | Use `RoundRobinConfig`-compatible fields | `d708da5` (FE) |
| 2026-07-29 | E7 | FE | Final lock-in: “Assign at least one participant or team…”; team CSV timeouts | Map pool participant→team_id; `scoring_mode=team`; 600s CSV timeout | `e6ef36d` (FE) |
| 2026-07-30 | E5/pods | BE | RR/pods shells left empty — seed consume blocked reuse across matches | Allow seed reuse when seed_orders repeat in `fill_shells_with_slots` | `89b8ccd` (BE) |
| 2026-07-30 | E4 | BE | Stepladder stuck after match 1 — no feeder wiring from structure sync | Wire `feeder_b_series_id` chain for stepladder shells | `89b8ccd` (BE) |
| 2026-07-30 | E7–E12 | BE | Team finals inflated (~19 series) — pool counted member rows | Dedupe pool fill / target count by `team_id` | `89b8ccd` (BE) |
| 2026-07-30 | all | FE | Scoring assertions + match-structure sync between score waves; E2 UI save; JWT re-login | `assertions.ts`, `scoring.ts`, `uiFlow.ts`, `apiClient.ts` | `5c5c4ed` (FE) |

---

## Frontend ↔ backend trace map

| UI area | Key FE | Key BE |
|---------|--------|--------|
| Event setup / flow / prizes | `EventDetails`, `EventFormatCard`, `PrizePayoutInformationCard`, `EventFlowPreview` | `events_crud`, `events_prizes`, `events_final_nodes`, `round_relationships`, `event_format_templates` |
| Registration / paid / check-in | `ParticipantManagementTable`, CSV upload | `event_participants` PATCH, CSV routes; `event_teams` |
| Squads assign/lock | `SquadsTab`, `EventRoundWorkspace` | `squads_*`, `rounds_ops` lock-in |
| Qualifying scoring | `EliminatorScoringSurface`, CSV controls | `games` batch/unified, `rounds` CSV, `process-advancement` |
| Final scoring | `ScoringSurfaceRouter` + method surfaces | `round_match_series`, `competition/*`, `match_play/*` |
| Payouts | Championship / Final Payouts modals | `prize-distribution`, `championship-results` |

**Excluded:** Lane Assignments tab, Side Action tab (and their APIs).

---

## Final all-green checklist

- [x] E1–E12 each `committed`
- [x] Full `@full-event-sim` suite green in one run (**12 passed**, ~26.1m after scoring hardening)
- [x] No cross-contamination regressions
- [x] `final_commit` recorded (FE + BE as needed)
- [x] `TEST_PLAN.md` Round 40+ pointer added

---

## Changelog

| Date | Change |
|------|--------|
| 2026-07-29 | Ledger + test directory scaffold created |
| 2026-07-29 | E1–E6 singles green; E7–E12 teams green after team scoring/assign fixes |
| 2026-07-29 | Final all-green pass: **12/12** `@full-event-sim` passed; Round 40 in TEST_PLAN |
| 2026-07-29 | Scoring coverage hardening: pool cut / final completion / championship+prize asserts; E2 UI score save/reload |
| 2026-07-30 | BE: RR/pods seed reuse, stepladder feeders, team pool dedupe (`89b8ccd`); FE asserts + E2 UI; full suite **12/12** (~26.1m) |
