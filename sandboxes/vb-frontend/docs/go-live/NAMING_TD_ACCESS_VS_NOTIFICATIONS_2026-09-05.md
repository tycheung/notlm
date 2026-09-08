# Naming: notification subscriptions vs TD access billing

**Status:** Locked guidance (2026-09-05)  
**Slice:** G — Ops / cleanup

## Two different “subscription” concepts

| Term in code / UI | Means | Tables / APIs |
|-------------------|-------|---------------|
| **TD access subscription** | Paid Standard or Side Action plan that unlocks director ops | `td_access_subscriptions`, `/api/v1/td-access/*`, Manage Subscription |
| **Notification subscription** | User prefs for email/push about events | account notification preference routes, not billing |

## Rules

1. Admin dashboard **Subscriptions** tile and `BillingStats` count **TD access** plans only.
2. Do not name notification prefs “subscriptions” in customer-facing TD billing copy.
3. Prefer “TD access”, “plan”, or “pass” in billing UI; reserve “subscription” for Stripe/plan rows.
4. `subscriptionTds` on system stats = distinct users with any active TD access plan (Standard or SA).
