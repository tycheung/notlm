# Full Event Simulation E2E

Full end-to-end Playwright simulations of tournament director event workflows.

**Progress ledger:** [`FULL_EVENT_SIMULATION_E2E.md`](./FULL_EVENT_SIMULATION_E2E.md) (tracked copy; workspace root mirror). See TEST_PLAN Round 40.

## What these tests cover

Each bundle creates a **2-stage event** (qualifying eliminator → method-specific final) and exercises:

1. **Event Info** — format, fees, handicap, prize pool / final nodes, event flow
2. **Participant Management** — registration (sample UI + CSV/API bulk), paid & checked-in edits
3. **Squads** — assign entrants, lock round
4. **Game Scoring** — qualify, advance, score final (method-specific surface)

**Excluded:** Lane Assignments tab, Side Action tab.

## Bundles

| Spec | Format | Entrants | Final |
|------|--------|----------|-------|
| `singles/e1-elim-to-elim.spec.ts` | singles | 120 bowlers | eliminator |
| `singles/e2-elim-to-bracket.spec.ts` | singles | 120 bowlers | single-elim bracket |
| `singles/e3-elim-to-double-elim.spec.ts` | singles | 120 bowlers | double-elim bracket |
| `singles/e4-elim-to-stepladder.spec.ts` | singles | 120 bowlers | stepladder |
| `singles/e5-elim-to-round-robin.spec.ts` | singles | 120 bowlers | round_robin |
| `singles/e6-elim-to-pods.spec.ts` | singles | 120 bowlers | pods |
| `teams/e7-elim-to-elim.spec.ts` | teams | 120 teams (size 2–5) | eliminator |
| `teams/e8` … `e12` | teams | 120 teams (size 2–5) | same six finals |

## Tags

- `@fullflow` — gated like other live-backend specs
- `@full-event-sim` — this suite only

## Required environment

| Variable | Purpose |
|----------|---------|
| `PW_E2E_TD_EMAIL` | Seeded TD (default seed: `td@example.com`) |
| `PW_E2E_TD_PASSWORD` | Seeded password (default: `password123`) |
| `PW_E2E_API_URL` | Live API origin, e.g. `http://127.0.0.1:8000` |

Frontend must be built with `VITE_API_URL` pointing at the same API. Postgres must be seeded (`backend/scripts/seed_test_data.sql`).

If env vars are missing, specs are **skipped**.

## Running

```bash
# All full-event-sim bundles
npm run test:e2e:full-event-sim

# Single epic
npx playwright test tests/e2e/full-event-simulation/singles/e1-elim-to-elim.spec.ts
```

Expect multi-minute runtimes (120+ entrants, scoring, advancement).

## Architecture

- **API provisioning** builds tournament/event/structure/roster/scores at scale (see `helpers/`).
- **UI assertions** open every in-scope tab, prove registration/paid/check-in edits, scoring surfaces, and payout read models.
- Progress tracked in workspace root [`FULL_EVENT_SIMULATION_E2E.md`](../../../../FULL_EVENT_SIMULATION_E2E.md).

## Plausible scenario defaults

- Entry fee $90, house cut 18%, handicap 200 / 90%
- Qualifying: 1-game eliminator (speed at 120 scale)
- Advancement cuts sized per final (e.g. top 32 bracket, top 5 stepladder, top 8 RR, top 16 pods)
- Championship final node with percentage prize allocation
