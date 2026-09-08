# Victory Bowling — React frontend

Tournament director and bowler UI for the Victory Bowling Tournament Management System.

**Repo:** [VictoryBowlingSoftware/react-frontend](https://github.com/VictoryBowlingSoftware/react-frontend)  
**API:** separate repo `fastapi-backend` (workspace folder `backend/`)

## Stack

- React 19 + TypeScript + Vite 6
- TanStack Query for server state; React Context for auth / alerts / scoring UX
- Tailwind + MUI (date pickers and selected controls)
- Axios API client (`src/api/`)
- Vitest unit tests; Playwright e2e (`tests/e2e/`)

## Local development

```bat
REM From react-frontend/
scripts\run_local.bat
```

Or: `npm install` then `npm run dev -- --host 127.0.0.1 --port 5173`.

| Expect | Value |
|--------|--------|
| UI | http://127.0.0.1:5173 |
| API | http://127.0.0.1:8000 (see backend `scripts/run_local.ps1`) |
| `VITE_API_URL` | Optional; defaults to local API in dev |

Seeded TD login (after backend seed): `td@example.com` / `password123`

## Roles & primary surfaces

| Role | Entry | Notes |
|------|--------|--------|
| Bowler | `/`, `/tournaments`, `/my-tournaments`, `/account` | Register, view events, nearby filter on tournament list |
| Tournament director | `/director/*` | Events, squads, scoring, side actions, format wizard |
| Admin | `/admin/*` | Users, system settings, bowling centers |

Shared director/admin event pages use role-scoped routes (`src/routes/roleScopedRoutes.tsx`).

### Nearby tournaments

Use the **Nearby** filter on `/tournaments` (browser geolocation and/or saved home bases + radius). There is no separate nearby page; address free-text geocoding is **not** implemented on the API.

### Lanes assignment

Event **Lane Assignments** tab is available for directors with `can_manage_lanes`. Covers pairs in play, occupancy, lettered slots (`1A`…), auto-batch / check-in assign, drag-and-drop board grid, movement (incl. USBC league), movement PDF, per-game lane stamping, and score-sheet lane labels in Game Scoring.

### Side actions

Event **Side Action** tab supports brackets, high game, high series, and eliminator (event/squad pools). See `docs/adr/0002-side-action-event-squad-pools.md`.

## Scripts (CI-aligned)

```bash
npm run check:datetime
npm run check:god-components
npm run lint:api
npm run lint:side-actions
npm run test:cov
npm run build
npm run test:e2e -- --grep-invert @fullflow   # smoke / mocked
npm run test:e2e:fullflow                     # needs seeded backend + env
```

E2E profiles and env vars: [`tests/e2e/README.md`](tests/e2e/README.md).

## Datetime policy

Naive UTC for domain datetimes. Use `src/utils/dateUtils.ts`.  
In a full workspace clone, policy text lives at [`../docs/datetime-policy.md`](../docs/datetime-policy.md). CI enforces via `npm run check:datetime`.

## Test coverage ledger

Cross-repo TD coverage plan (git-tracked in backend): [`../backend/docs/TEST_PLAN.md`](../backend/docs/TEST_PLAN.md). Workspace root may also have `TEST_PLAN.md`.

## Documentation map

| Doc | Role |
|-----|------|
| This README | Living setup + product surface summary |
| `docs/adr/*` | Architecture decisions |
| `DEVELOPER_HANDOFF.md` | **Historical** session notes (July 2026) — not source of truth |
| `HIGH_GAME_AND_ELIMINATOR_HANDOFF_2026-07-14.md` | **Historical** HG/eliminator ship notes; prefer ADR-0002 for pools |

Invariants belong in `.cursor/rules/` and ADRs, not handoffs.
