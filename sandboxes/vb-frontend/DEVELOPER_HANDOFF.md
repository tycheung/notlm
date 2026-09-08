# Victory Bowling — Developer Handoff

> **Historical (2026-07-06).** Session notes only — not architecture source of truth.  
> Prefer [`README.md`](README.md), `docs/adr/*`, and `.cursor/rules/`.  
> **Stale in this doc:** side actions described as tournament-level / “brackets only”; that was replaced by event + per-squad pools (ADR-0002) with bracket, high game, high series, and eliminator. Nearby is a filter on `/tournaments`, not a dedicated page. For lanes, see [`README.md`](README.md) — Lane Assignments tab is live (grid, stamping, scoring lane labels).

**Session scope:** Work performed after cloning repos and standing up **local development** (PostgreSQL, backend, frontend, seed data).  
**Date:** July 6, 2026  
**Repos:** `fastapi-backend`, `react-frontend` (separate GitHub repos under VictoryBowlingSoftware)

---

## Quick local dev reference

| Service | URL / connection |
|---------|------------------|
| Frontend | http://127.0.0.1:5173 |
| Backend API | http://127.0.0.1:8000 |
| API docs | http://127.0.0.1:8000/docs |
| PostgreSQL 17 | `localhost:5433`, DB `bowling_app`, user/pass `postgres` |

**Start commands**

```powershell
# Backend (loads .env automatically)
powershell -File fastapi-backend\scripts\run_local.ps1

# Frontend
react-frontend\scripts\run_local.bat
```

**Test login (seed data):** `td@example.com` / `password123`

**Important:** Backend must use **Python 3.12** (Poetry venv at `fastapi-backend/.venv`). System Python 3.14 is too new for some deps.

**Seed data:** `fastapi-backend/scripts/seed_test_data.sql` was loaded once during setup.

---

## Part 1 — Non–side-action changes

### 1.1 Local environment & connectivity

| Change | Files / notes |
|--------|----------------|
| Created `fastapi-backend/.env` | Local DB on port **5433**, `DEBUG=True`, HTTP cookie settings for dev auth |
| `fastapi-backend/scripts/run_local.ps1` | Loads `.env` then runs `uvicorn` with Poetry + Python 3.12 |
| `react-frontend/scripts/run_local.bat` | Starts Vite on `127.0.0.1:5173` |
| **axios localhost HTTP fix** | `react-frontend/src/api/axios.ts` — allow `http://localhost` / `127.0.0.1` (was forcing HTTPS and breaking local API) |
| **CORS for local dev** | `fastapi-backend/main.py` — `CORSMiddleware` added; `TrustedHostMiddleware` allows `localhost` / `127.0.0.1` |
| **Redirect middleware** | `RedirectDebugMiddleware` only upgrades HTTP→HTTPS when **not** `DEBUG` (avoids broken local redirects) |

### 1.2 Tournament Director dashboard

| Change | Files |
|--------|-------|
| Wait for auth before fetching tournament data | `react-frontend/src/pages/tournament_director/TournamentDirectorDashboard.tsx` |
| Clearer message when user not logged in | Same file |

**Note:** If the dashboard spins forever, the API may be hung — restart backend (`run_local.ps1`). Uvicorn `--reload` can get stuck on `Waiting for background tasks to complete` after long score batches.

### 1.3 Game Scoring tab — blank screen fix

**Root cause:** `IndividualScoring.tsx` referenced undefined variable `games` (~line 420).

| Fix | File |
|-----|------|
| Use `getParticipantGames(epId, spId)` prop instead of bare `games.find(...)` | `react-frontend/src/components/event/IndividualScoring.tsx` |
| Game Scoring tab shows non-blocking warning when squads not locked (does not hide entire UI) | `react-frontend/src/components/event-round/tabs/GameScoringTab.tsx` |
| Pass full `isAuthorizedForManagement` through scoring surface | `EventRoundWorkspace.tsx`, `EventDetails.tsx` |

**E2E test added:** `react-frontend/tests/e2e/game-scoring-tab.spec.ts`

### 1.3b Match play diagram scoring (non-eliminator rounds)

Replaced the React Flow match-play editor with side-action-style bracket diagrams.

| Piece | Location |
|-------|----------|
| Router | `ScoringSurfaceRouter.tsx` — eliminator → grid; bracket/stepladder/RR/pods → diagram surfaces |
| Core surface | `match-play-diagram/surfaces/MatchPlayDiagramScoringSurface.tsx` |
| Shared UI | `match-play-diagram/shared/*` (also used by `SideActionBracketDiagram`) |
| Score persist | `event-scoring/visual/useMatchPlayGameGrid.ts` — `game_updates` only |
| Structure sync | `RoundMatchSeriesAPI.syncMatchStructure(roundId)` when shells missing |

See `MATCHPLAYFRONT.md` for full epic ledger.

### 1.4 Round scores CSV

| Issue | Status |
|-------|--------|
| **Download failed for singles events** — UI sent `teamScoringMode` from localStorage (`mixed`/`team`) instead of `individual` | **Fixed** in `react-frontend/src/components/event-scoring/RoundScoreCsvControls.tsx` via `effectiveScoringMode` |
| **Upload timeout** — ~195 score updates exceed axios **15s** timeout; backend batch can take 60–120s+ | **Not fixed** — increase timeout on `RoundsAPI.uploadRoundScoresCsv` and/or optimize `unified_batch_game_operation` |
| Upload error message is generic `"CSV upload failed."` on timeout | Consider surfacing `getErrorMessage()` in catch block |

Validated user CSV format (`round_1_scores_individual.csv`): 65 bowlers × 3 games, `scoring_mode=individual`, scores 150–300 — format is correct.

---

## Part 2 — Side actions (general)

Side actions are **tournament-level** optional competitions (bracket pots, high game, etc.). Entries are tied to **side action templates**; bowlers sign up via roster, not check-in.

### 2.1 Event UI wiring

| Change | Files |
|--------|-------|
| Replaced “Coming soon” on Event **Side Actions** tab | `EventDetails.tsx` → `EventSideActionsPanel.tsx` → `SideActionsTab.tsx` |
| TD bracket setup on Side Actions tab; signups on **Participant Management → Side action signups** | `EventSideActionsPanel.tsx` |
| Create modal supports fixed type (Brackets only for now) | `CreateSideActionModal.tsx`, `SideActionForm.tsx` |

### 2.2 Defaults & payout configuration

| Requirement | Implementation |
|-------------|----------------|
| Default max participants **8** | `react-frontend/src/constants/sideActionDefaults.ts` |
| Default entry fee **$5** | Same |
| House cut **$ per entry** (= entry fee by default) | `FeesAndPrizesForm.tsx`, backend create defaults |
| Remove check-in requirement | Form + backend defaults |
| Bracket payout spots: 8-player → 2 spots; 16–32 → up to 4 | `react-frontend/src/utils/sideActionPayouts.ts` + tests |
| Dollar-amount payout rows (not percentages) | `FeesAndPrizesForm.tsx` refactor |

### 2.3 Bowler signup

| Feature | Files |
|---------|-------|
| Signup board UI | `SideActionSignupBoard.tsx` |
| Roster “Side action signups” integration | Event participants flow + `SideActionsAPI.getRosterSignups` / `updateRosterSignup` |
| Backend signup endpoints | `fastapi-backend/routes/side_actions.py` (signup board, roster signups) |

### 2.4 Label cleanup

UI label **“Tickets” → “Entries”** in bracket preview / side action tables (`SideActionsTab.tsx`).

---

## Part 3 — Bracket engine

The bracket pot system is a **quota-aware, conflict-aware** engine scoped to an
event squad pool.

### 3.1 Architecture overview

```
Side action template entries (by user)
        ↓ aggregate by display name
   calcMaxBrackets / calcQuotas
        ↓
   generateBrackets (conflict-aware seeding)
        ↓
   Stored in side_action.type_config.bracket_engine.brackets[]
        ↓ (on tournament game complete)
   apply_round_scores → applyScore / cascade winners
```

**Bowler identity:** Display name = `first_name last_name` (see `adapters.py` / `adapters.ts`). Tournament game scores map to bracket bowlers by this name.

**One score per bowler per game** applies across **all** bracket pots simultaneously (real bowling).

### 3.2 Pure logic modules (mirror TS ↔ Python)

| Module | Purpose |
|--------|---------|
| `math` | `calcMaxBrackets`, `calcQuotas` |
| `generation` | Placement, `conflictAwareSeeding`, `buildBracket`, `generateBrackets` |
| `scoring` | `evalMatch`, `applyScore`, `cascadeClear` (G1/G2 ties, tiebreak partners `p1b`/`p2b`) |
| `stats` | `computeStats`, `computeBracketFinancials` |
| `conflicts` | `computeConflicts`, heat levels (`OK` / `ELEVATED` / `HIGH`) |
| `sim` | `fillAllRound` (sim), **`apply_round_scores`** (live sync) |

**Frontend:** `react-frontend/src/utils/bracketEngine/`  
**Backend:** `fastapi-backend/services/bracket_engine/`

**Tests**

- Frontend: `react-frontend/tests/unit/utils/bracketEngine.test.ts` (Vitest)
- Backend: `fastapi-backend/tests/unit/test_bracket_engine.py` (pytest)  
- Known pre-existing failure: `test_eval_match_g2_tiebreak_partner` (unrelated tiebreak expectation)

### 3.3 Backend API endpoints

All under `/api/v1/side-actions/{id}/bracket-engine/` (TD/admin + tournament master):

| Method | Path | Purpose |
|--------|------|---------|
| GET | `preview` | Ephemeral preview (new RNG each call) |
| POST | `generate` | Persist pots to `type_config.bracket_engine` |
| GET | `financials` | Per-bowler payout report from **stored** brackets |
| POST | `sync-scores` | Pull completed tournament game scores into stored pots |

Service layer: `SideActionService.preview_bracket_engine`, `generate_bracket_pots`, `get_bracket_engine_financials_report`, `sync_bracket_engine_for_tournament_game`.

**Stored shape** (`type_config.bracket_engine`):

```json
{
  "generated_at": "...",
  "generated_by": 2,
  "max_brackets": 12,
  "bracket_count": 12,
  "unplaced_tickets": 3,
  "quotas": [...],
  "financials": {...},
  "brackets": [...],
  "last_synced_game": 1,
  "last_synced_at": "..."
}
```

Helper: `react-frontend/src/utils/sideActionBracketStorage.ts`

### 3.4 Auto score sync (event squad → bracket pools)

1. `apply_round_scores(brackets, round_idx, bowler_scores)` — `bracket_engine/sim.py`
2. `RoundService.round_game_number_all_scored(round_id, game_number)` — all game shells for that game number scored
3. `GameService.sync_bracket_engine_for_changed_games()` — after score saves, when a game number is complete
4. Hooked in `_run_post_score_recalc_pipeline()` — `fastapi-backend/routes/games.py`
5. Manual sync: **View brackets** button calls `POST .../sync-scores` first; `sync_bracket_engine_for_side_action()` replays all complete games

**Round index:** resolved from each pool's effective `game_numbers` plan.

**Score used:** `game.total_score` if set, else `game.score`.

### 3.5 Frontend — Side Actions tab (`SideActionsTab.tsx`)

Director actions per bracket side action:

| Button | Behavior |
|--------|----------|
| Edit | `EditSideActionModal` |
| Preview | Calls preview API; shows summary + bowler table |
| Generate brackets | Persists pots |
| View brackets | Sync scores → open viewer modal |
| Conflicts | `BracketConflictsReportModal` |
| Reset and generate | Explicitly resets the pool before creating a new run |
| **Financials** | Opens `BracketFinancialsReportModal` |

### 3.6 Preview bowler table columns

| Column | Source |
|--------|--------|
| **Entries** | `quota.count` (tickets purchased) |
| **Placed** | `quota.quota` (entries placed in pots) |
| **Refund** | `quota.unused` (unplaced → refund) |
| **Eliminated** | `stats.r1l + stats.r2l` |
| **1st** | `stats.first` |
| **2nd** | `stats.second` |

Preview API now returns `stats`, `entry_fee`, `payouts` (not just quotas).

Helper: `react-frontend/src/components/side_actions/bracketEnginePreviewRows.ts`

### 3.7 Bracket viewer

| Component | Purpose |
|-----------|---------|
| `SideActionBracketViewerModal.tsx` | Lists all generated pots |
| `SideActionBracketDiagram.tsx` | Three-column tree (Game 1 / Game 2 / Final) with connectors, scores, TBD styling |

### 3.8 Conflicts report

| Component | Purpose |
|-----------|---------|
| `BracketConflictsReportModal.tsx` | Full conflict table, heat badges, show-all toggle |
| Regenerate CTA | Refreshes after `generateBracketPots` |

Conflict row fields: `co`, `g1`, `g2pot`, `g2act`, `g3pot`, `g3act`, `heat`.

### 3.9 Financials report

| Component | Purpose |
|-----------|---------|
| `BracketFinancialsReportModal.tsx` | Summary totals + per-bowler payout lines |

Per bowler: refund entries, 1st/2nd/split wins with dollar amounts, refund $, winnings, **total payout**.

Uses `GET .../bracket-engine/financials` for stored brackets; preview passes data inline.

---

## Part 4 — Known gaps & recommended next work

### High priority

1. **CSV upload timeout** — Raise axios timeout for round CSV upload; profile `unified_batch_game_operation` for ~200 updates.
2. **Bracket sync performance** — Large score batches + sync + downstream recalc can wedge uvicorn reload; consider async task or debounced sync.
### Medium priority

3. **Financials / stats after sync** — bracket runs store bracket state but not
   recomputed `stats`/`financials` on every sync (computed on demand).
4. **Name collision** — Two users with identical display names share one bracket identity.
5. **Preview vs generate RNG** — Preview regenerates each call; only **Generate** persists. Document for TDs.
6. **`test_eval_match_g2_tiebreak_partner`** — Failing Python test; verify engine behavior vs test expectation.

### Low priority / polish

8. Windows console logging — Unicode arrow `→` in redirect logs causes `UnicodeEncodeError` on cp1252 (cosmetic).
9. Live refresh — Bracket viewer requires re-open or **View brackets** to see synced scores (no websocket).
10. **SideActionStatus** on create — Confirm desired initial status (`DRAFT` vs `REGISTRATION_OPEN`) for new side actions.

---

## Part 5 — Key file index

### Local dev
- `fastapi-backend/.env` (not committed — create from `.env.template`)
- `fastapi-backend/scripts/run_local.ps1`
- `react-frontend/scripts/run_local.bat`

### Game scoring / CSV
- `react-frontend/src/components/event/IndividualScoring.tsx`
- `react-frontend/src/components/event-round/tabs/GameScoringTab.tsx`
- `react-frontend/src/components/event-scoring/RoundScoreCsvControls.tsx`
- `fastapi-backend/routes/games.py` (`unified_batch_game_operation`, `_run_post_score_recalc_pipeline`)

### Side actions UI
- `react-frontend/src/components/side_actions/SideActionsTab.tsx` (main TD hub)
- `react-frontend/src/components/side_actions/EventSideActionsPanel.tsx`
- `react-frontend/src/constants/sideActionDefaults.ts`
- `react-frontend/src/utils/sideActionPayouts.ts`

### Bracket engine
- `react-frontend/src/utils/bracketEngine/*`
- `fastapi-backend/services/bracket_engine/*`
- `fastapi-backend/services/side_action_service.py` (preview, generate, sync, financials)
- `fastapi-backend/services/game_service.py` (score → bracket sync orchestration)
- `fastapi-backend/routes/side_actions.py`

### API client
- `react-frontend/src/api/side-actions.ts`

---

## Part 6 — Test commands

```powershell
# Frontend unit tests (bracket engine)
cd react-frontend
npm test -- tests/unit/utils/bracketEngine.test.ts

# Backend unit tests (bracket engine)
cd fastapi-backend
.\.venv\Scripts\python.exe -m pytest tests/unit/test_bracket_engine.py -q

# E2E (requires running app + Playwright)
cd react-frontend
npx playwright test tests/e2e/game-scoring-tab.spec.ts
```

---

## Part 7 — External reference docs

These were provided by the product owner and drove bracket engine behavior (not in repo):

- `BRACKET_ENGINE_HANDOFF.md` — generation, scoring, stats, financial math
- `CONFLICT_SYSTEM_HANDOFF.md` — conflict detection and heat thresholds

Port **pure logic** from handoff; skip React prototype UI components listed under “Skip”.

---

## Part 8 — Deployment note

**`git push` does not auto-deploy.** Production uses AWS CodeDeploy for backend; frontend deploy is separate. Local changes in this handoff are **not committed** unless the team has committed them separately — verify git status in each repo before merging.

---

*End of handoff. Questions: trace from `SideActionsTab` → API → `side_action_service` → `bracket_engine` for bracket features; from `GameScoringTab` → `unified_batch_game_operation` → `_run_post_score_recalc_pipeline` for score → bracket sync.*
