# Mystery Doubles — FE companion note

**Branch:** `feat/mystery-doubles`  
**BE companion:** `fastapi-backend` `feat/mystery-doubles` (same delivery window)  
**Packet:** `fastapi-backend/docs/adr/0003-mystery-doubles-handoff.md`  
**ADR:** `fastapi-backend/docs/adr/0003-mystery-doubles.md`

## Intent

Directors configure Mystery Doubles on the event Side Action tab, draw/redraw pairs via ConfirmDialog, view live standings, and open entry-summary / standings reports without growing `SideActionReportsMenuModal` past its CI ceiling.

## Partition

| Commit | Scope |
|--------|--------|
| A | Bracket `game_order` UI + report stage labels |
| B | Soft-delete ConfirmDialog across SA tables |
| C | MD feature folder UI + reports + e2e mocks |
| D | This note (points at BE handoff packet) |

## Smoke

- Mocked e2e: `npx playwright test tests/e2e/mystery-doubles-reports.spec.ts` — **verified**
- Live UI create/draw — follow BE handoff; roster PUT enroll still **unverified** on current seed

## Print-report rails (reconciled 2026-07-21)

Merged `main` (`print-report-kit.mdc` / `report-registry.mdc`). MD documents already use
`buildReportDocument` + `reportFooterHtml` under `features/side-actions/mystery-doubles/reports/`;
no extra chrome fork. No FE product changes for this pull.
