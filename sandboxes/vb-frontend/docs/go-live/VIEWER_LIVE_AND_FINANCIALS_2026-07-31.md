# Viewer live package + financial visibility (locked)

**Date:** 2026-07-31  
**Status:** Product direction locked — live viewer IA shipped (2026-07-31); remaining polish noted below  
**Related:** `GO_LIVE_MASTER_TODO_2026-07-30.md` §3

---

## Live viewer package (locked)

Opening an event (or tournament share) as a **viewer** should support:

1. **Up-to-date tournament results** (live / current competition state)
2. **Event picker** when the tournament has multiple competition events
3. **Scope picker by format:** round / squad / overall (whichever applies)
4. **Live side actions** visible to viewers (results / activity — not TD setup)
5. **Bowler drill-down** (click a bowler):
   - Their **active** side actions
   - Their **side-action results** for that individual
   - **No dollar amounts** unless the viewer is a **participant** (see financials rules)

This is richer than today’s Event Info + live-scores modal: tournament-scoped navigation, SA live for spectators, and person-centric SA outcome views without money for non-participants.

---

## Financial visibility (locked)

### Side actions

| Viewer | What they see |
|--------|----------------|
| Non-participant (public / other bowlers) | Outcome labels only — e.g. “2nd in high game pot”, “23 brackets won”. **No entry fee, rake, or dollar amounts** |
| Participant in that event | Full SA financials for that event (entry fee, rake, own + event SA money surfaces as appropriate) |
| TD / admin / master | Full financials (ops) |
| Delegate with **EVENT_INFO** and/or **GAME_SCORING** | Full prize fund + SA money for that event (desk ops). Other capability-only grants do not unlock money. |

### Prize fund (main event)

| Setting | Behavior |
|---------|----------|
| **Entry fee** | **Always visible** on event details (registration pricing) |
| **`display_prize_fund_public`** — **default OFF** | Only **participants** (and TD/admin) see house cut / add-on / place $ |
| Toggle **ON** | Non-participants may view prize fund details (still not SA money) |
| Participant | Always can see prize fund / event financials for events they participated in |

### Bowler own money (always)

A bowler who **participated** in an event can always see:

- Their **own** financial results for that event
- That event’s **financials / prize fund / side-action** money surfaces (participant entitlement)

Independent of the public prize-fund toggle.

---

## Implementation notes (engineering)

- Enforce on **API** responses (strip/zero money fields for non-participants); do not rely on FE hiding alone.
- Define “participant” consistently: approved (or at least registered) `event_participants` for that event; clarify team-only membership if needed.
- Prize-fund public toggle: `Event.display_prize_fund_public` (default `false`) — TD toggle in Prize Fund modal.
- SA standings/report payloads: split **outcome** vs **payout** fields; public/live viewers get outcomes only.
- Live viewer IA: tournament → event → round/squad/overall → results + SA; bowler profile sheet for SA activity.
- Existing live scores modal is a starting point, not the full package.

### Shipped (2026-07-31 slice)

| Piece | Status |
|-------|--------|
| `services/financial_visibility.py` | Done |
| `display_prize_fund_public` on Event + FE toggle | Done (restart BE for `create_all`) |
| Gate `GET …/prize-distribution` | Done |
| Strip $ on `GET …/final-payouts` when not entitled | Done |
| Open HG/HS/Elim/MD standings to live viewers + strip $ | Done |
| Full live viewer IA / bowler drill-down | Done (tournament Live tab + public SA board + bowler sheet) |
| Spectator bracket live view | Done (`PublicLiveBracketViewerModal`; $ stripped) |
| Event complete prize-fund redaction (keep entry fee) | Done (`prize_fund_details_visible`) |
| Signup-board / SideActionRead money strip (incl. SA entry fee) | Done |

---

## Still open (not locked here)

- TD public display name / center branding
- ~~Finished-event retention~~ — **locked:** forever while published; Complete event when all rounds done; same depth as live; share via `/tournaments/{id}`; manual unpublish near Share (see go-live §3)
- Whether anonymous (logged-out) viewers get the same non-participant package as logged-in non-participants (default assumption: **yes**, same strip rules) — **verified in Phase 1 tests**
- Lane sheets for viewers (not required by this lock)

## Share / public app URL

Tournament Share / QR uses `VITE_PUBLIC_APP_URL` (no trailing slash). When unset, the client falls back to `window.location.origin`, which is wrong when the TD UI host differs from the public app host. Set the env in each FE deploy environment.

## Unpublish vs Complete

Unpublish clears `published_at` only. **`completed_at` is retained** so history/complete state survives a temporary hide. Re-publish does not clear `completed_at`.

## Organizer live preview while locked

When `TD_ACCESS_GATING_ENABLED=true` and the tournament is not unlocked, **tournament masters** (organizer / co-owner) and admins may still open live for preview. Public publish and anonymous live stay blocked until unlock. EVENT_INFO assistants without master status follow the runnable gate.
