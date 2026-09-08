# Playwright E2E Profiles

This folder contains:

- smoke specs (`login-page`, `public-home`, `director-auth-guard`, `director-dashboard`, `director-tournaments`)
- full-flow certification specs (format/scoring/progression/payout, **tournament CRUD**)

## Required environment for full-flow specs

- `PLAYWRIGHT_BASE_URL`: frontend URL (default in config is local preview)
- `PW_E2E_TD_EMAIL`: seeded TD login email
- `PW_E2E_TD_PASSWORD`: seeded TD login password
- `PW_E2E_EVENT_ID`: seeded event id for full flow + live refresh checks
- `PW_E2E_MIXED_EVENT_ID`: seeded mixed-format event id (optional; falls back to `PW_E2E_EVENT_ID`)
- `PW_E2E_DE_EVENT_ID`: optional; event id whose active scoring round is **double elimination** (visual / bracket E2E). After seeding, run the materializer below and paste the printed id.
- `PW_E2E_API_URL`: API origin for `@fullflow` CRUD spec (e.g. `http://127.0.0.1:8000`). Frontend preview must reach this API via `VITE_API_URL` at build time.

### Double-elimination demo seed (SQL + Python)

1. Load `backend/scripts/seed_test_data.sql` into your Postgres dev DB (same process you use for other E2E seeds). This creates event **`DE Visual Demo`** on **`Spring Test Open 2026`**, round friendly name **`DE Visual Demo`**, format **`DE match play Bo3`**, and squad **`DE Demo Bracket Squad`** with four bowlers.
2. From `backend/`, materialize the bracket graph (idempotent if series already exist):

   `python -m scripts.materialize_de_demo_bracket`

3. Set **`PW_E2E_DE_EVENT_ID`** to the printed event id, then run full-flow / `@fullflow` specs that target the DE visual surface.

## Running

- Smoke:
  - `npm run test:e2e`
- **Regression checklist** (maps to `GO_LIVE_FULL_REGRESSION_CHECKLIST_2026-08-30.xlsx`):
  - `npm run test:e2e:checklist`
  - See `tests/e2e/checklist/README.md`
- Full-flow only:
  - `npm run test:e2e:fullflow`

## Notes

- Full-flow specs are tagged with `@fullflow`.
- If required env vars are missing, full-flow specs are skipped.
- Event **Lane Assignments** tab is live for users with `can_manage_lanes`; smoke asserts the tab opens and has no Coming Soon placeholder.
- Nearby tournaments are exercised via the tournament list filter, not a `/tournaments/nearby` page.
