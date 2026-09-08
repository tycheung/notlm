# Side Actions (High Game + Eliminator + Reports) — developer handoff

> **Historical (2026-07-14).** Ship notes for HG + Eliminator + reports — not living architecture.  
> Prefer [`README.md`](README.md), ADR-0001 / ADR-0002, and `.cursor/rules/`.  
> **Stale in this doc:** brackets as tournament-scoped (`event_id` null); pools are event + per-squad (ADR-0002). “No Alembic” meant no feature migrations — a baseline revision now exists but stays **unused** for day-to-day schema until v1. High Series shipped after this handoff (ADR-0001).

**Date:** 2026-07-14 (evening)  
**Status:** Historical (shipped; do not treat “not pushed yet” as current)  
**Repos:** `fastapi-backend`, `react-frontend` (separate git roots)  
**Local test:** FE http://127.0.0.1:5173 · API http://127.0.0.1:8000 · `td@example.com` / `password123`  
**Do not** hit production (`app.victorybowling.com` / `api.victorybowling.com`) unless explicitly asked.

**Supersedes / companions**

| Doc | Role |
|-----|------|
| This file | Historical HG + Eliminator + reports notes through 2026-07-14 |
| `HIGH_GAME_HANDOFF_2026-07-14.md` | Earlier HG notes (may be absent from this clone) |
| `SIDE_ACTION_LOCK_HANDOFF_2026-07-13.md` | Brackets lock UX notes (may be absent) |
| `SIDE_ACTION_REPORTS_SPEC_2026-07-13.md` | Print/report notes (may be absent) |
| `docs/adr/0001-high-series-ui.md` / `0002-…` | Living decisions for HS + event/squad pools |

---

## Executive summary

Shipped event-scoped **High Game** and **Eliminator** side actions end-to-end for TD testing, plus printable reports and global payout inclusion. Architecture follows Cursor rules: extracted packages (don’t grow `side_action_service` / `EventDetails` / `EventRoundWorkspace`), `user_id` identity, no GET writes, POST for options-heavy reports, pre-v1 column reconcile (no Alembic).

| Type | Scope | Lock entries? | Standings | Reports |
|------|--------|---------------|-----------|---------|
| **Bracket** | Tournament (may leave `event_id` null) | **Yes** (scoring gate) | Bracket engine | Signup, Bracket Entry Summary, Alive List, Brackets, Individual, Payout |
| **High Game** | **Event required** | **No** (live scores) | `GET …/high-game/standings` | Signup, HG Entry Summary, HG Report, Payout |
| **Eliminator** | **Event required** | **No** | `GET …/eliminator/standings` | Signup, Elim Entry Summary, Elim Report, Payout |

Roster signup: HG and Eliminator checkbox enroll → **one ticket per squad** the bowler is on (`roster_signup_service` + `event_squad_membership`).

---

## Product — High Game

- Event-scoped pot; live `Game` scores; no bracket generate.
- **Scratch / Handicap** (event default or manual base/%).
- Games via checkboxes (`type_config.game_numbers`); event game count = **max** round/squad `game_count` (not sum).
- **Per game** vs **combined** (combined = list of individual game scores, not sums).
- Divisions: Men + Women both checked = **one open pool**; uncheck one for gender-only; second SA for a separate ladies pot.
- Money: flat places + per-entry or flat expenses (`dollars_per_entry` / `amount`). Live fund snapshot + fund-mismatch warning.
- Ties: split places (1st+2nd)/2 → next is 3rd.
- **No entry lock** for HG; only brackets require lock (`TYPES_REQUIRING_ENTRY_LOCK`).

### `type_config` (High Game)

```json
{
  "handicap_mode": "scratch" | "handicap",
  "handicap_source": "event_default" | "manual",
  "handicap_base_score": 200,
  "handicap_percentage": 90,
  "game_numbers": [1, 2, 3],
  "payout_mode": "per_game" | "combined",
  "divisions": { "men": true, "women": true }
}
```

Create sends `max_participants: 10000`, requires `event_id`, and stores the
selected games in `game_numbers`.

---

## Product — Eliminator

Multi-game side pot that **drops bowlers each cut game**; last game in the window is the **final / payout** game (no further drop).

### TD config

| Field | Behavior |
|-------|----------|
| Game window | Explicit ordered `game_numbers` selection |
| Drop mode | **Percentage of original entries** (same count every cut) **or** flat count |
| Round mode | Up / down when percentage (e.g. 30 entries × 33% round up → drop **10** each cut) |
| Scratch / Handicap | Same pattern as HG |
| Financials | Places + expenses like HG (own config card; no separate FeesAndPrizesForm) |

### UI must-haves (implemented)

- Entries collected + projected drops each game.
- Warning if config yields **zero** alive for the final game.
- Display bowlers alive in final (payout) game.
- List table: window, drop label, entries, final alive, fund / zero-alive warnings.
- View modal: live cut rounds + final payouts.

### `type_config` (Eliminator)

```json
{
  "game_numbers": [1, 2, 3],
  "drop_mode": "percentage" | "flat",
  "drop_amount": 33,
  "round_mode": "up" | "down",
  "handicap_mode": "scratch" | "handicap",
  "handicap_source": "event_default" | "manual",
  "handicap_base_score": 200,
  "handicap_percentage": 90,
  "handicap_flg": true
}
```

Legacy stub keys (`cut_percentages`, `rounds`) are deprecated; setup normalizes via `services/eliminator/config.py`.

**Important math rule:** percentage drops are **% of entered bowlers**, applied again each cut (not % of remaining alive). Flat drops are a fixed count each cut (capped at alive).

---

## Reports

Menu: `SideActionReportsMenuModal` filtered by opener `sideActionType`. Signup + Payout always shown.

### Global

| Report | Types | Notes |
|--------|-------|-------|
| Sign-up Sheet | All | Columns for every active SA (Eliminator included) |
| Payout | Bracket + **High Game** + **Eliminator** | HG = standings payouts; Eliminator = final-round place payouts |

### High Game

| Report | Options |
|--------|---------|
| High Game Entry Summary | Scope this pot / all HG on event |
| High Game Report | Game checkboxes; winners (`payout > 0`) vs all scored |

### Eliminator

| Report | Options |
|--------|---------|
| Eliminator Entry Summary | Scope this / all eliminators on event; cut projection + fund |
| Eliminator Report | Display: **Columns** (default, ≤4 games) or **Pages** |

**Eliminator Report layout (columns — default)**

- Banner: **Game N cut score** / **Game N low to cash** from actual results (lowest advancing / lowest paid score).
- Sorted by furthest game played, then score in that game.
- Blank cells if not alive for that game; solid **red** = cut that game; solid **green** = paid place (no zebra override).
- Prize column always shown.

**Pages mode:** one game per page; cut games prefer single page; final expands; cut/low-to-cash line per game; payouts shown.

Routes (POST):

- `/side-actions/reports/high-game-entry-summary`
- `/side-actions/reports/high-game`
- `/side-actions/reports/eliminator-entry-summary`
- `/side-actions/reports/eliminator`

---

## Backend map (`fastapi-backend`)

### New packages / services

| Path | Role |
|------|------|
| `services/high_game/` | Pure fund / ranking / tie payouts |
| `services/high_game_service.py` | Standings + `payouts_by_user` |
| `services/eliminator/math.py` | Drop count + cut projection |
| `services/eliminator/config.py` | Normalize type_config on create |
| `services/eliminator_service.py` | Live cut sim + standings + `payouts_by_user` |
| `services/side_action_reports/high_game.py` | Print builders |
| `services/side_action_reports/eliminator.py` | Print builders |
| `services/event_squad_membership.py` | Squads for user in event |
| `services/side_action_lock_service.py` | Lock helpers; only BRACKET requires entry lock |

### Notable edits

- `schemas/side_action.py` — `event_id` required for HG + Eliminator; standings + report schemas
- `routes/side_actions.py` — standings GETs (read-only); report POSTs
- `roster_signup_service.py` / `side_action_signup_service.py` — HG + Eliminator per-squad tickets
- `side_action_report_service.py` — payout columns include Eliminator
- `side_action_service.py` — thin `_setup_eliminator_side_action` calling `eliminator.config`
- `models/side_action.py` / `side_action_entry.py` — `event_id` / `squad_id` (+ reconcile)
- `pyproject.toml` — unit-cov omit `high_game_service` / `eliminator_service` (DB-heavy; math + report helpers stay measured)

### Tests added / updated

- `tests/unit/test_high_game_math.py`, `test_high_game_reports.py`
- `tests/unit/test_eliminator_math.py`, `test_eliminator_reports.py`
- `tests/unit/test_bracket_engine_service_sync.py` — mock `house_cut_type`/`house_cut_amount`
- `tests/unit/test_tournament_event_counts.py` — ruff F401 cleanup

---

## Frontend map (`react-frontend`)

### New / rewritten

| Path | Role |
|------|------|
| `HighGameConfigForm.tsx` | Scoring, games, mode, divisions, financials |
| `HighGameStandingsModal.tsx` | View standings |
| `EliminatorConfigForm.tsx` | Window, drop %, projection, financials |
| `EliminatorStandingsModal.tsx` | View cuts / final |
| `utils/highGameFundBalance.ts` | Fund mismatch helper |
| `utils/eliminatorProjection.ts` | Mirror BE cut projection |
| `SideActionReportsMenuModal.tsx` | Filtered report menu + configure steps |
| `utils/sideActionReportPrint.ts` | Shared print CSS/helpers (+ elim styles) |
| `components/side_actions/reports/*` | Document builders (HG + Elim + brackets) |
| `sideActionTypeChoices.ts` | Brackets, High Games, **Eliminators** enabled |

### Notable edits

- `SideActionsTab.tsx` — Brackets + High Games + Eliminators tables; Reports menus; standings modals
- `SideActionForm.tsx` — HG/Elim financials in type card; hide starting/max fields; `event_id` / max 10000
- `api/side-actions.ts` — standings + report API types/methods
- `types/side_action.ts` — HG + Eliminator config types
- `EventDetails.tsx` — max game count for HG/Elim windows (minimal touch)
- `tests/e2e/director-event-details.spec.ts` — expect **3** Create new CTAs (Bracket + HG + Elim)

---

## Pre-push verification (run 2026-07-14 evening)

### Backend

| Check | Result |
|-------|--------|
| `poetry run ruff check .` | Pass |
| `poetry run python scripts/check_datetime_naive_utc.py` | Pass |
| `poetry run python scripts/check_pydantic_v2.py` | Pass |
| `poetry run mypy .` | Pass (238 files) |
| `poetry run pytest tests/unit -q --cov …` | **369 passed**, **76.3%** cov (≥75%) |
| OpenAPI / schema / datetime smoke | 14 passed |

### Frontend

| Check | Result |
|-------|--------|
| `npm run check:datetime` | Pass |
| `npm run lint:api` | Pass |
| `npm run test:cov` | **531 passed** |
| `npm run build` | Pass |
| `npm run test:e2e -- --grep-invert "@fullflow"` | **22 passed** (PowerShell: quote `"@fullflow"`) |

**Note:** Full `npm run lint` still has many pre-existing `no-explicit-any` hits in older tests; CI gate is **`lint:api`**. Full `tests/integration` suite was not run end-to-end in this session (CI smoke slices were).

---

## Guardrails checklist (for reviewer)

- [x] No substantial new logic in `side_action_service` / `EventDetails` / `EventRoundWorkspace` god paths  
- [x] Identity keys are `user_id`  
- [x] GET standings have no DB writes  
- [x] Print reports are POST  
- [x] No Alembic; column reconcile only if models need it  
- [x] FE types/API synced for new endpoints  
- [x] E2E updated for Eliminator enablement  

---

## Push guidance

Two separate remotes — push each when asked:

```bash
# Backend
cd fastapi-backend
git status
# review, then commit/push only when requested

# Frontend
cd react-frontend
git status
# review, then commit/push only when requested
```

Suggested commit grouping (if splitting):

1. BE: High Game math/service/routes + roster squad tickets + lock carve-out  
2. BE: Eliminator math/service/routes + reports package + payout  
3. FE: High Game UI + reports  
4. FE: Eliminator UI + reports + e2e Create-new count  

Or one BE + one FE commit each if the team prefers a single “side actions HG+Elim” ship.

**Do not commit:** `.env`, `cookies.txt`, local SQLite / `test_cascade.db`, secrets.

---

## Known follow-ups (not blocking push)

- Bracket SA migration to required `event_id` / squad pools  
- High Set (sums)  
- Dedicated Eliminator PDF polish beyond columns/pages (multi-squad pools, etc.)  
- Legacy Eliminator `process_cuts` / stub generate paths still in `side_action_service` — live UX uses standings from `Game` rows, not those stubs  
- Full FE `eslint .` backlog (`any` in old tests)  
- Optional: short Eliminator-only handoff extract if marketing/docs need a separate sheet  

---

## Manual TD smoke (local)

1. Event → Side Action → Create **High Game** / **Eliminator**.  
2. Roster enroll (checkbox).  
3. Enter scores → **View** standings.  
4. **Reports** → Entry Summary + type Report; verify Payout includes pots.  
5. Eliminator: set 30-ish entries mental model, 33% round up, 3 games → drop 10 / 10, final 10; preview Columns report cut scores + solid red/green.
