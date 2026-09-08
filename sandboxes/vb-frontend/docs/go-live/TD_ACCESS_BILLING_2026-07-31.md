# TD Access Billing — Stripe Direction (MVP)

**Date:** 2026-07-31 (SKUs realigned 2026-08-16 to year-1 list)  
**Status:** Domain + gating landed; Stripe Checkout env-gated. Catalog cents still the 2026-07-31 intro ($199.99 / $19.99 / $19.99) until Price IDs are remapped.  
**Related:** `LAUNCH_PRICING_2026-07-31.md`, `GO_LIVE_MASTER_TODO_2026-07-30.md`, `year-1-pricing.pdf`

## SKUs (planning locked — Checkout remap TODO)

| Plan | Year-1 list | Stripe mode |
|------|-------------|-------------|
| Standard annual | **$199** / yr | Subscription — unlimited **full** tournaments |
| Standard monthly | **$25** / mo | Subscription — unlimited **full** tournaments |
| Tournament credit / pass | **$20** | One-time; full unlock on one tournament |
| **Side Action annual** | **$99** / yr | Subscription — unlimited **SA-only** tournaments |
| **Side Action monthly** | **$15** / mo | Subscription — unlimited **SA-only** tournaments |
| Side Action pass | **$10** | One-time; `sa_only` license on one tournament |
| Large cap lift | **$25** | One-time; lifts **that** tournament 500 → 2,000 unique (not in Checkout yet) |
| Custom 2,000+ | Quote | Manual |
| Center / Org | Contact us | Manual (no Checkout) |

Self-serve tournaments include a **500 unique-participant** cap (unique people, not entries). Hard-block add-participant at the cap. Lift stacks on pass or subscription; it does not unlock a locked tournament by itself.

`LAUNCH_ANNUAL_CENTS` / `LAUNCH_MONTHLY_CENTS` / `LAUNCH_CREDIT_CENTS` and `PricingPage` fallbacks still use 19999 / 1999 / 1999. Remap those and `STRIPE_PRICE_*` before treating Checkout as year-1 list.

## Domain (shipped)

| Table | Purpose |
|-------|---------|
| `td_access_subscriptions` | Annual/Monthly rows + Stripe IDs + period end + locked price |
| `tournament_credits` | Ledger (purchase date, unused / applied / refunded) |
| `tournament_licenses` | Permanent per-tournament unlock |

Do **not** reuse notification `subscriptions`.

## Unlock rule

Tournament is **runnable** when gating is on and any of:

1. Active Annual/Monthly on the **organizer**, or  
2. A `tournament_licenses` row for that tournament, or  
3. Admin bypass

## Gating (shipped, **off by default**)

Env: `TD_ACCESS_GATING_ENABLED=true` to enforce.

| Allowed while locked | Blocked while locked |
|----------------------|----------------------|
| Create tournament / events | Add bowlers / participants |
| Side-action setup | Scoring |
| Reports UI | Publish / public live links |

Hooks:

- `assert_user_can_manage_event_capability` for `PARTICIPANTS` + `GAME_SCORING`
- Public singles + team sign-up
- Publish registration-settings
- `can_view_event_live` (live only; published archive still uses `published_at`)

## APIs (shipped)

- `GET /api/v1/billing/catalog`
- `GET /api/v1/tournaments/{id}/access`
- `POST /api/v1/tournaments/{id}/access/apply-credit`
- `POST /api/v1/admin/td-access/grant-credits?user_id=&count=` (ops / local until Stripe)

## Still to build / env-gated

**Scope:** one Stripe integration project — Checkout, webhooks, pricing/billing UX, bowler→TD upgrade, referrals, and Billing Portal ship together (not separate workstreams).

1. ~~Add `stripe` Python package + Checkout Session create for 3 SKUs~~ — **shipped** (env-gated)  
2. ~~Webhook handler~~ — **shipped** stub (`/billing/webhooks/stripe`); wire ledger writes when keys live  
3. Map Stripe Price IDs via `STRIPE_PRICE_ANNUAL` / `MONTHLY` / `TOURNAMENT_CREDIT`  
4. ~~Customer Billing Portal~~ — **shipped** endpoint  
5. Pricing page + director purchase CTA (FE Phase 5)  
6. **Referrals (same Stripe project)** — Checkout/signup code capture; webhook qualification on qualified pay (new TD ≥1 month or ≥1 tournament credit; SA-only excluded); claim wallet grants free month or tournament credit; annual cap (6/year); account billing UI. BE stubs: `td_referral*` models + `GET/POST /billing/referral*` (no FE, no payment hook yet)  
7. Referral refinements: free-month vs Season, claim UX, referred-TD perk?, no-USBC fallback  
8. ~~Unused-credit automated refunds~~ — **shipped** admin endpoint when payment_intent present  
9. Remap catalog cents + Stripe Price IDs to year-1 list ($199 / $25 / $20)  
10. Unique participant cap (500) + large-cap lift Checkout SKU ($25)  
11. Free tournament pass on verified USBC ID (once per ID); two admin-comp Annual seats  
12. **Side Action SKUs** — Stripe Price IDs (parked). Create-time `sa_only` shell locked 2026-08-29. **Side Action monthly ($15) and annual ($99)** locked 2026-09-02 for weekly walk-in operators. See `GO_LIVE_MASTER_TODO_2026-07-30.md`.  
13. **Bowler path to upgrade to paid TD** — self-service role promotion on successful Annual/Monthly/credit purchase; route to `/director` (today `Role.BOWLER` at signup + admin-only role change; Stripe payment does not grant TD access)  
14. **TD accessibility to pricing and payments** — footer/home/director nav links to `/pricing`; account billing tab (subscription status, unused credits, referral claim when enabled); Stripe Billing Portal entry; checkout `?checkout=success|cancel` messaging  

### Grandfathering metadata

Subscribe before **2027-08-01** locks `locked_price_cents` through at least **2028-08-01**. Checkout metadata includes `locked_price_cents` at session create for webhook persistence.

## Local test without Stripe

1. Restart backend (`create_all` for new tables)
2. `TD_ACCESS_GATING_ENABLED=true`
3. Admin: `POST /api/v1/admin/td-access/grant-credits?user_id=<td>&count=1`
4. TD: apply credit on tournament details banner

## Existing DB schema (operator must)

If the database predates 2026-07-31 columns, run after pull (idempotent):

```bash
poetry run python scripts/add_display_prize_fund_public.py
poetry run python scripts/add_event_completed_at.py
```

New empty DBs get columns via `create_all`. Do not add Alembic feature revisions pre-v1.

## Ops smoke checklist (`TD_ACCESS_GATING_ENABLED=true`)

1. Restart BE with gating on.
2. Grant one credit (admin endpoint above).
3. TD banner shows locked + unused count → Apply credit → unlocks.
4. Blocked while locked: add bowlers, scoring, publish, public live.
5. Allowed while locked: tournament/event create, SA setup, reports UI (empty).
6. Organizer may preview live while locked; public publish remains gated.
