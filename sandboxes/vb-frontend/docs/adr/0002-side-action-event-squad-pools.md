# ADR-0002: Side-action event and squad pool UI

**Date:** 2026-07-16  
**Status:** Accepted (implemented)

## Context

At decision time the UI configured side actions at event or tournament level
while squad pooling was implicit or absent. Directors could not reliably see
which squad, games, entrants, funds, or payout a side action used.

## Decision

1. Side actions are created from an event and always require that event.
2. Directors choose all event squads or a selected subset. The server
   materializes one isolated pool per chosen squad.
3. Setup shows event defaults plus optional per-squad overrides.
4. A shared game picker emits unique ascending event game numbers:
   - Bracket and Eliminator use the selected order as stages.
   - High Game uses per-game or combined ranking.
   - High Series uses sum or best-N scoring.
5. Every setup, signup, entrants, standings, bracket, fund, payout, and report
   surface identifies its squad pool.
6. React never computes authoritative scores or payouts.

## Consequences

- Query keys include side-action and pool identifiers.
- Non-contiguous selections such as Games 1, 4, and 5 are supported.
- Best-N is limited to High Series.
- Existing contiguous-window controls will be replaced incrementally.
- Frontend game-plan tests mirror backend examples.
