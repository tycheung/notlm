# Playwright regression checklist

Automated smoke coverage for `GO_LIVE_FULL_REGRESSION_CHECKLIST_2026-08-30.xlsx`.

These tests **do not replace** manual QA. They catch obvious breakages early:
pages that 404, crash, fail to render, or block core navigation.

## Run

```bash
cd react-frontend
npm run test:e2e:install          # once: Chromium browser
npm run test:e2e:checklist        # full checklist suite (~10–15 min)
```

With UI (step through / debug):

```bash
npx playwright test tests/e2e/checklist --ui
```

Against **already-running** local servers (your manual desk-check session):

```bash
set PLAYWRIGHT_SKIP_WEBSERVER=1
set PLAYWRIGHT_BASE_URL=http://127.0.0.1:5173
npx playwright test tests/e2e/checklist --grep @checklist
```

## What is covered

| Spec file | Workbook sheet | ~Tests |
|-----------|----------------|--------|
| `01-public-auth` | Modules_Views (public) | Login, pricing, legal, guards |
| `02-td-modules` | Modules_Views (TD) | Dashboard, tournaments, tools |
| `03-admin-bowler-modules` | Modules_Views | Admin + bowler routes |
| `04-event-tabs` | Modules_Views | All 8 event tabs |
| `05-format-events` | Formats | Each seeded format event |
| `06-reports` | Reports | PDF previews + Excel downloads |
| `07-integration-smoke` | Integration_Flows | A01, A03, A04, A09, A15, A16, A18, A21 |

Test titles include checklist IDs like `[MOD-024]` or `[FLOW-A04]` — search the Excel **Handoff Ref** or filter by ID.

## What still needs manual testing

- Permission matrix (assistant with single capability only)
- SA generate / settle / payout dollar amounts
- Bracket rollover, Alibi partner freeze, load test (A17)
- Mobile layout, public anon live on published events
- Billing / Stripe / locked tournament gating
- Copy tournament end-to-end (until branch merged)

## Data

Uses the **SQLite e2e seed** (`e2e.td@example.com` / `e2e-password-123`), not production Postgres.
Playwright starts `run_e2e_api.py` + Vite automatically unless `PLAYWRIGHT_SKIP_WEBSERVER=1`.
