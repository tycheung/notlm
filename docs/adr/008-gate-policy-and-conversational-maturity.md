# ADR-008 — Slot/confirm gate policy & conversational maturity

**Status:** Accepted  
**Date:** 2026-09-08

## Context

Demos enable `intents.slots` / `intents.confirm`. Proactive offers, packed
multi-step utterances, and queue auto-resume also launch steps. Without an
explicit policy, hosts see inconsistent “why didn’t it ask?” behavior.

Separately, the coach should feel more LLM-like (repair, discourse, confidence,
telemetry) while remaining **deterministic at runtime** (pack NLU first; no
runtime LLM on the hot path).

## Decision

### When slot/confirm gates run

| Path | Slot ask | Confirm |
|------|----------|---------|
| Single-step launch via `launchStep` (typed alias, discourse step, chip→parse) | **Yes** | **Yes** |
| Affirmative on **confirm** pending | n/a | already affirmed → `skipGate` |
| Slot answers that complete required slots | remaining slots | then confirm if listed |
| Affirmative on **proactive** pending (Yes chip / “yes”) | skip | **skip** (offer already affirmed intent) |
| Typed **step alias** while proactive pending | clear pending → normal launch | **Yes** (gates apply) |
| Packed multi-step (`A then B`) / queue `executeStep` resume | **No** (execute path) | **No** |
| Correction relaunch (`isCorrection`) | **No** | **No** |

Rationale: packed/queue paths are mechanical progress; chat turns are
conversational. Proactive Yes is already a soft confirm.

### Conversational maturity (v1 additions)

1. **Repair banks** — `repair.blocked` / `repair.ambiguous` / `repair.unknown` /
   `repair.low_confidence` via `pickReply` (pack-overridable).
2. **Confidence tiers** — rule parse scores → `high` / `mid` / `low`; low single
   hits ask before acting.
3. **Discourse** — anaphora + light repair (“change the name”, “undo that”).
4. **Correction stale fan-out** — `dependentStepIds` marked stale on correction.
5. **Coach telemetry** — optional `onCoachEvent` (no secrets / raw PII policy).
6. **Session freshness** — dispatch tracks session across `setSession` in one turn.

### Non-goals (unchanged)

- No runtime LLM NLU on the pack hot path.
- No host product API writes from the assistant (UI actions / navigate / spotlight only).
- Firefox remains type-only (no Web Speech).

## Consequences

- Pack authors document packed vs chat gate differences in the cookbook.
- E2E helpers dismiss or answer multi-turn; packed paths stay one-shot.
- Hosts may subscribe to `onCoachEvent` for debugging without scraping chat DOM.
