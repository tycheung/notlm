# ADR-0001: High Series UI (HIGH_SET)

**Date:** 2026-07-16  
**Status:** Accepted (implemented)

## Context

Backend ships High Series on `SideActionType.HIGH_SET` with live standings.
Frontend needs create/list/standings/reports without a client scoring engine.

## Decision

1. Enable `HIGH_SET` in `EVENT_SIDE_ACTION_TYPE_CHOICES` as **High Series**.
2. Reuse `HandicapConfigSection` + `OpenPotFinancialsSection`; no game-pick UI.
3. Own table + standings modal + report menu defs / builders; thin tab shell.
4. Standings from `GET …/high-set/standings` only — no calculate-winners client.
5. Extract report option panels so `SideActionReportsMenuModal` stays under CI size gate.

## Consequences

- E2E expects four “Create new” CTAs (Bracket, High Games, High Series, Eliminators).
- Capability / counting details live in backend ADR-0001 and
  `services/side_actions/capabilities.py`.

## Capability matrix rows affected

Frontend mirrors backend: event-scoped, ticket-per-squad signup, live standings.
