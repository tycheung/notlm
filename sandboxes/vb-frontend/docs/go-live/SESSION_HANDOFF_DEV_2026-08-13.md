# Developer handoff — Baker bracket / reports / format desk (2026-08-13)

**Repos:** `fastapi-backend`, `react-frontend` (separate GitHub remotes)  
**Working tree:** both currently on `main` with **large uncommitted** piles — **do not push `main` directly**. Cut a shared feature branch first (suggested: `feat/baker-bracket-reports-desk`).  
**Local:** FE `http://127.0.0.1:5173` · BE `http://127.0.0.1:8000` · TD `td@example.com` / `password123`  
**Fixture used this session:** Event **Leading Lady Trios** (`events.id=6`, tournament 5, `team_size=3`) · Qualifying round 14 → Match Play Finals round 15 (Baker single-elim, top 16)

---

## Intent

Directors can **generate / view / print event brackets**, see **cut/cash lines and team HCP on standings**, and **score Baker team brackets on the match diagram** so winners auto-seat into the next round (including when Game 1 was entered on the team sheet).

---

## Companion contract (ship FE + BE together)

| Area | Contract / note |
|------|-----------------|
| Match structure sync | `POST /rounds/{id}/match-structure/sync` now also runs bracket shell-score reconcile |
| Score save follow-up | `after_games_scores_saved` overlays squad team-shell pinfall onto bracket series shells when method=`bracket` |
| Overlay mapping | Score-sheet `game_number` N → tree `bracket_round` N−1 (Game 1 = Round of 16 only) |
| MATCH_PLAY format sync | Keeps **event team size** for team events (avoids team_size=1 rebinds that break pinfall shells) |
| Standings | Annotates `standing_status=advance` from primary outgoing TOP_N relationship; team HCP rollup prefers member sum |
| Reports (new/extended) | Roster, financials, prize fund, score sheets, lane assignment sheets, side-action financials, **event bracket print** |
| FE scoring surface | Baker **brackets** use diagram (`ScoringSurfaceRouter`); baker **RR/qual** stay on team score sheet |

**Alembic:** several untracked revisions exist under `fastapi-backend/alembic/versions/` (`baker_game_flag`, `sa_entry_is_all`, `sa_user_templates`). Pre-v1 preference is still SQLModel/`create_all` + DB reset coordination — confirm with steward before applying migrations in shared envs.

**Do not commit:** `react-frontend/.env.development`, `fastapi-backend/scripts/_tmp_*`, `scripts/tmp_bracket_verify_*.json` unless intentionally shipping verify tooling.

---

## Examples (setup → action → expect)

1. **Generate bracket** — Format Editor → Match Play Finals → seed mode by seed → Generate → expect 15 series for 16-team SE; **View bracket** shows Round of 16 → … → Final.  
2. **Print bracket** — **Print bracket** or viewer **Print preview** → Print / Save as PDF → landscape letter for ≥8 opening matches.  
3. **Baker advance** — Score Game 1 on team sheet **or** Round of 16 diagram cells → save → sync/structure or score path → winners seat into quarters; both sides filled → QF score boxes appear.  
4. **Ties** — Equal Baker scores → series `in_progress` → **Tied — pick winner** on diagram → then feeder seats.  
5. **Standings cut** — Qualifying → Final top 16 relationship → Standings show Advance through 16th + cut line when toggled.

---

## Smoke (local)

- [ ] Login TD → event 6 Format Editor → generate / view / print bracket  
- [ ] Game Scoring → Match Play Finals shows **bracket diagram** (not 16-row Baker grid)  
- [ ] Complete / resolve remaining Round of 16 ties → QF inputs present  
- [ ] Standings tab: handicap totals + Advance cut for top 16  
- [ ] Reports menu: Standings / Roster / Score Sheets / Lane Assignments / Financials preview open without crash  

---

## Risks / known sharp edges

- **Dual shells:** Baker brackets still create series-linked team games **and** squad team shells; overlay copies pinfall one way. Later rounds should be scored on the **diagram** so `match_series_id` is set.  
- **God component:** `ParticipantManagementTable` is at **1686/1700** after demographics/USBC modal extraction — do not grow without further extract.  
- **SideActionTemplateControls:** eslint `react-refresh/only-export-components` warning only.  
- Uncommitted scope is broader than this chat (lanes copy-from-round, SA user templates, eliminator schedule UI, demographics, many reports). Review `git status` in **both** repos before commit grouping.  
- Work is sitting on **`main`** — branch before any push.

---

## Key paths touched (this arc)

### Backend
- `services/competition/bracket/shell_score_overlay.py` (**new**)
- `services/competition/bracket/orchestrator.py`, `seed_mode.py`
- `services/match_play/coordinator.py`
- `services/round/match_play_format_sync.py`
- `services/team_scoring_service.py`
- `services/event_reports/*` (+ `routes/events_reports.py`, `schemas/event_reports.py`)
- `routes/round_match_series.py` (sync → reconcile)
- Lanes: `services/lanes/copy_from_round.py`, `pair_conflicts.py`, game stamp / seats

### Frontend
- Format Editor: `BracketMatchupsPanel`, `EventBracketViewer*`, `eventBracketDiagram`, `bracketMatchupsUtils`
- `buildEventBracketReportDocument.ts` + other `build*ReportDocument` additions
- `ScoringSurfaceRouter.tsx` (baker bracket → diagram)
- Match diagram layout: `layoutUtils.ts`, `constants.ts` (`MATCH_BLOCK_HEIGHT=100`)
- Roster: `ParticipantDemographicsModal`, `ParticipantAssignUsbcModal`

### Tests (guards)
- BE: `test_bracket_shell_score_overlay`, coordinator overlay test, standings FakeRoundService `get_outgoing_relationships`
- FE: `ScoringSurfaceRouter.test`, `buildEventBracketReportDocument.test`, `EventBracketViewer.test`, EventReportsMenuModal roster card fix

---

## Guardrails status (2026-08-13 evening)

| Check | Result |
|-------|--------|
| FE `check:datetime` | pass |
| FE `check:vibe-ship` | pass |
| FE `check:god-components` | pass (after modal extract) |
| FE `lint:api` / `lint:side-actions` | pass (1 refresh warning) |
| BE `check_vibe_ship_invariants.py` | pass |
| BE ruff (touched bracket/report paths) | pass |
| Focused unit tests (bracket overlay, standings, reports menu, scoring router) | pass after fixes |

**Still recommended before push:** full `pytest` / `vitest` / `vite build` on the branch after commits are staged.

---

## Suggested ship steps

1. Create matching branch names in both repos from current `main`.  
2. Phase commits (reports / lanes / bracket-advance / SA templates) rather than one mega-commit.  
3. Open paired PRs with Summary + Test plan (+ Intent / Smoke / Risk / Companion).  
4. Use companion **TEST_AND_TODO** handoff for QA checklist.
