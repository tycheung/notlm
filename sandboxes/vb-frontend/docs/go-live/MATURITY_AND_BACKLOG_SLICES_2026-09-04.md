# Maturity review & backlog slices — 2026-09-04 (updated 2026-09-05)

**Status:** Active planning backlog  
**Related:** SUBSCRIPTION_ACCESS_TODO.md, GO_LIVE_MASTER_TODO_2026-07-30.md,
NAMING_TD_ACCESS_VS_NOTIFICATIONS_2026-09-05.md, ALEMBIC_CUTOVER_V1_2026-09-05.md,
SENTRY_SETUP_2026-09-05.md

## Goals

| Goal | Target |
|------|--------|
| **G1 — Honest monetization** | Purchases/passes match unlocks; Stripe writes ledger |
| **G2 — Entitlement integrity** | Role only via entitlement sync / admin-flag |
| **G3 — Gating-safe launch** | TD_ACCESS_GATING_ENABLED=true without revenue leaks |
| **G4 — Ops maturity** | APM + real Alembic cutover |
| **G5 — Product parity** | Billing polish vs Tournament Doctor; keep SA desk edge |
| **G6 — Director Assistant maturity** | Pack/queue/glossary/lookup + guided format builder product-quality |

## Scores (2026-09-05)

**Code maturity ~7.1/10** — architecture 7.2, tests 8, security 7.3, observability 5.2, FE UX 6.8, API 8.1, migrations 4.2, debt 6.0, docs 8.2.

**Product:** depth ~7.2 / launch-ready ~5.9. Guided TD ops **6.8**. Billing **5.8**. Peers: CDE BTM (desktop/scoring), Tournament Doctor (cloud billing).

## Build slices

### Slice E — Role integrity — DONE
- [x] Strip role on PUT /users/me + remove from UserUpdate schema
- [x] Referral credit → sync_user_entitlement
- [x] UserCreateMinimal coerce to bowler; batch create forces bowler
- [x] Unit tests for schema / no self-promote via role field

### Slice A — Plan-aware entitlement — DONE
- [x] Standard vs SA helpers + access status
- [x] SA monthly does not unlock full tournaments
- [x] Free SA→full upgrade requires Standard
- [x] get_active_subscription prefers Standard over SA

### Slice B — Pass consume — MOSTLY DONE
- [x] SA pass consume on SA-only create
- [x] large_cap_lift consume → 2000 cap
- [x] FE banner: SA pass copy, lift pass counts, disable when empty
- [x] Apply credit: locked SA shell uses Side Action pass
- [x] Access status exposes `unused_large_cap_lift_credits`
- [ ] E2E/API: grant pass → consume → demote when empty (needs gating-on fixture)

### Slice C — Stripe go-live — MOSTLY DONE (prod smoke blocked on secrets)
- [x] Webhook applies checkout + subscription updates + entitlement sync
- [x] Price ID env vars + Manage Subscription Checkout when configured
- [x] Catalog cents year-1 aligned
- [x] BillingStats = TD access (SA counts + pass kinds); not notification prefs
- [x] Stripe Standard purchase upgrades existing SA shells via `maybe_upgrade_sa_only_if_subscribed`
- [ ] Live Stripe Price IDs in prod env + webhook secret smoke test

### Slice D — Account write paywall — MOSTLY DONE
- [x] Create gated via `assert_account_can_create_*`
- [x] Tournament PUT + event create edit asserts
- [x] Participant batch create → `assert_account_can_write_director_ops`
- [x] Billing `can_write_director_ops` + FE GatedActionButton on create CTAs
- [x] Broader write-route matrix: `assert_user_can_write_event_capability` on participant writes, team create, game scoring helpers/`games_crud`; event PUT/PATCH/DELETE account edit
- [x] E2E lapsed seeds (`LAPSED_TD_*` in e2e seed) + HTTP `test_lapsed_director_writes_http` + Playwright `lapsed-director-access.spec.ts`

### Slice F — SA route hardening — MOSTLY DONE
- [x] Format templates + tournament copy already full-TD-only
- [x] Audit: SA blocked on format templates (HTTP); `update_game` / delete allow SA; FE `isDirectorSuiteRole` on tournament/event/round/squad/game director surfaces
- [x] Day-of QA A10: eligibility unit suite documented in SESSION_HANDOFF; SA HTTP suite expanded (`test_sa_role_access_http`)
- [ ] Manual desk pass of A10 form/UI checkboxes with gating on (still checklist)

### Slice G — Ops / cleanup — IN PROGRESS
- [x] Naming doc (TD access vs notification subscriptions)
- [x] Alembic cutover v1 plan doc
- [x] Sentry setup doc (DSN-gated; no secrets in repo)
- [x] Wire maybe_upgrade from Stripe Standard checkout
- [x] Assistant utterance extract (god-component shrink start)
- [ ] Install/init Sentry when DSNs available
- [ ] Execute Alembic baseline + CI gate
- [ ] Optional Grant Credits page deprecation
- [ ] Branch protection

### Slice H — Director Assistant — MOSTLY DONE
- [x] Dead branch / clearStale / extractors / go_back / pick buttons / flash / notes honesty
- [x] `dispatchUserUtterance.ts` refactor
- [x] **Format builder (G6 extension):** template `description` + match API; `formatDraftCompiler` (NL + graph); wizard coach surface for `apply_format`; defer default structure when format is queued; save+apply+`notifyStepCompleted`; lexicon/glossary/`data-guide-id`s; Playwright `director-guide-format.spec.ts` + corpus expansions
- [x] E2E: confirm button click (ambiguous bowler choices); SA+subscription pack summary (live UI)
- [x] Live UI smoke for format wizard apply path (`director-guide-format.spec.ts`)

## Sequencing remaining (no invented work)
```
B demote fixture → C prod Stripe smoke → G Sentry+Alembic exec → F manual A10 desk pass
```

Do **not** enable `TD_ACCESS_GATING_ENABLED` in prod until B demote proof + C prod smoke (D strongly recommended).

## Out of scope
Mobile Live #44, AutoScoring, full USBC awards parity, Whisper/Firefox voice, silent API creates from Assistant.
