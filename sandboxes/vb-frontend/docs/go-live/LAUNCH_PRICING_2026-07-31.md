# Victory — Launch Pricing Decision

**Status:** Year-1 list locked (planning)  
**Date:** 2026-07-31 (list prices realigned 2026-08-16)  
**Source of truth for list prices:** `year-1-pricing.pdf` (canvas recommended SKUs)  
**Planned increase:** End of season / summer 2027 (tentative August 1, 2027)

Supersedes the 2026-07-31 intro SKUs ($199.99 / $19.99 / $19.99). Gating, credits, refunds, referrals, and who-pays rules below are unchanged.

Stripe catalog constants and the public Pricing page still serve the old cents until Price IDs are remapped. Do not treat Checkout as live year-1 list until that remap ships. See `TD_ACCESS_BILLING_2026-07-31.md`.

---

## Year-1 list (now → first season)

| Plan | Price | Billing | Access |
|------|-------|---------|--------|
| Annual | **$199** | Pay upfront, annual | Unlimited **full** tournaments while active |
| Monthly | **$25** | Pay monthly | Unlimited **full** tournaments while active |
| Tournament pass | **$20** | One-time per tournament | That tournament only — full unlock, no subscription |
| **Side Action annual** | **$99** | Pay upfront, annual | Unlimited **SA-only** tournaments while active |
| **Side Action monthly** | **$15** | Pay monthly | Unlimited **SA-only** tournaments while active |
| **Side Action pass** | **$10** | One-time per tournament | That SA-only tournament — roster + run SA; **not** a scored Victory tournament |
| Large cap lift | **$25** | One-time, per tournament | Lifts **that** tournament from 500 → 2,000 unique |
| Custom 2,000+ | **Quote** | Manual | Extra API capacity that weekend |
| Center / Organization | **Contact us** | Custom quote | Multi-user package at a discount; case-by-case |

Self-serve plans include a **500 unique-participant** cap per tournament (unique people, not entries or events; re-entries do not eat the cap). Hard-block add-participant at the cap. Pay the lift to take one tournament to 2,000. Above 2,000 is quote.

### Packaging intent

- **Tournament pass** — default for annual / semi-annual TDs. **One tournament = one billable unlock.** Price **must stay ≤ monthly**. A $25 pass under a $20 month trains directors to subscribe for the weekend and cancel.
- **Monthly** — “I am running more than one tournament this month.” Unlimited while active, **not** a cheaper weekend pass and **not** “Annual billed monthly” as a discount SKU.
- **Annual** — for TDs who run enough that annual is clearly better. Ten $20 passes = $200; Annual is $199.
- **Side Action pass** — try-once / guest TD. Half a tournament pass ($10). One SA-only shell per purchase.
- **Side Action monthly / annual** — for TDs who run **pots-only walk-in events every week**. Unlimited create-as-SA-only tournaments while active. **$15/mo** breaks even at 2 nights vs passes; **$99/yr** beats ~10 passes. Must stay **below Standard** ($25 / $199) — parallel product line, not a cheap full tournament.
- **Side Action line (all SKUs)** — create-as-SA-only only: one round, eliminator scoring, side actions tied to those games. No format wizard, no public standings. Standard Annual/Monthly include SA on full tournaments and free-upgrade existing SA shells to full.
- **Large cap lift** — stacks on pass, monthly, annual, Side Action pass, or SA subscription. It does not unlock a locked tournament by itself.
- **Center / Organization** — bowling centers, associations, and multi-TD orgs. Package multiple users at a discount; **quoted case-by-case (manual)**. No self-serve quote wizard at launch — **advertise** clearly on pricing: “Contact us about center / organization pricing.”

### Billable unit + gating (locked)

**Billable unit:** one **Tournament** (not a single competition event/squad weekend inside it).

**Allowed before pay**

- Create the tournament
- Enter tournament details
- Create at least one competition event under it
- Side action **setup** (cannot run without bowlers)
- Reports UI (empty / no useful data without bowlers or scores)
- Lane assignment UI is moot (no bowlers to assign while locked)

**Blocked until pay**

- Add bowlers / participants
- Enter or manage scores
- **Live viewer / public live links** — locked so TDs cannot advertise a shareable event link before the tournament can actually be run

**What unlocks the block**

- Active **Standard Annual** ($199/yr) or **Standard Monthly** ($25/mo) → **full** unlock, **or**
- Purchased **tournament pass** ($20) / credit for that tournament → **full** unlock, **or**
- Active **Side Action annual** ($99/yr) or **Side Action monthly** ($15/mo) → unlimited **SA-only** create/run while active, **or**
- Purchased **Side Action pass** ($10) / SA credit for that tournament → **SA-only** shell (roster + run SA; not publicly listed; not a scored Victory tournament until upgraded to full)

A Standard subscription covers unlimited **full** tournaments while active (each under the unique cap unless lifted). A tournament pass covers **only that tournament** (full unlock). A Side Action subscription covers unlimited **SA-only** tournaments while active. A Side Action pass covers **only that SA-only tournament**. Standard unlock always includes side actions. SA subscriptions do **not** unlock full tournaments — buy a $20 pass or Standard sub for that weekend.

### Side Action line (locked 2026-08-29 shell + 2026-09-02 subscriptions)

Full entitlements: `GO_LIVE_MASTER_TODO_2026-07-30.md` § Side Action pass.

**Product:** create-as-**SA-only** at tournament create. Auto shell: one event, one qualifying round, one squad. Only format knob: **number of games** (eliminator scoring). Singles or teams. Side actions tied to that scoring shell. **Copy tournament** for next week’s walk-in session.

**SKUs**

| SKU | Year-1 | Who |
|-----|--------|-----|
| Side Action pass | **$10** one-time | Try-once, guest TD, one-off bracket night |
| Side Action monthly | **$15/mo** | Weekly walk-in pots (break-even vs 2 passes) |
| Side Action annual | **$99/yr** | Year-round pots-only operator (~10 passes) |

Never convert a full tournament backward to SA-only. **No public listing** — participants + TD only. Hide prize fund / format wizard / standings. Games do **not** feed averages until upgraded to full. **Standard** Annual/Monthly free-upgrade existing SA-only shells to full. Per-tournament upgrade MVP: pay $20 pass; $10 not credited back.

**Weekly walk-in persona:** TDs who run SA-only every week for whoever walks in — SA monthly/annual is their product line. $10/week in passes does not work.

### Archive / re-edit (locked)

- Tournaments/events that were created or run under a valid license remain **accessible indefinitely** to TDs and participants (history does not disappear after lapse).
- After Annual/Monthly lapse, re-editing a prior tournament is allowed once the TD has an active subscription again (or otherwise unlocks that tournament). Single-tournament license behavior for re-edit after “spent” license: treat as needing Annual/Monthly or a new license if further paid-run actions are required — refine if edge cases appear.

> Product copy note: rename the self-serve SKU from “Event” → **“Tournament”** everywhere customer-facing to match the rule and avoid confusion with in-app “events.”

### Acquisition / comps (year-1)

- **One free tournament pass** when a USBC ID is verified — lifetime, one per ID (not per email). Same 500 cap. That is the trial.
- **Testers:** grant two Annual seats from admin (price $0, expiry set by ops). Do not build a public “gift a sub” flow in year 1. Credits grant already exists; add a comp subscription flag.

### Integrity / abuse (open — added to go-live list)

Risk: a TD could create tournaments and enter fake scores to inflate a bowler’s average / history.

Safeguards to design (not locked yet):

- Report event control for **participants only** (locked 2026-08-29; no auto-notify to the TD on submit)
- Terms that allow Victory to suspend/cancel a TD account for fraudulent scoring
- Audit trail of who entered/changed scores
- Possible future: verification signals, USBC linkage rules, or limits on what feeds a “trusted” average

See `GO_LIVE_MASTER_TODO_2026-07-30.md` → **Data integrity & abuse**.

---

## Planned increase (end of season / summer 2027)

Reprice with real mix in hand — not before. Tentative date **August 1, 2027**.

| Plan | Year-1 list | Summer 2027 lever | Do not go under |
|------|-------------|-------------------|-----------------|
| Standard Annual | $199 | **$249** (still under CDE Pro) | $149 |
| Standard monthly | $25 | **$29** | $19 |
| Tournament pass | $20 | **$25** if mix is healthy | $12 |
| Side Action pass | $10 | **$12** | $8 |
| Side Action monthly | $15 | **$18** | $10 |
| Side Action annual | $99 | **$119** | $69 |
| Large cap lift | $25 | **$39** | $20 |
| Custom 2,000+ | Quote | Published turbo SKU if it repeats | Cover a second API box that weekend |
| Center / Organization | Contact us | Contact us (quotes may rise with list) | — |

### Notes on the increase

- Announce early so year-1 buyers understand list may move after the first season.
- **Tentative list-price increase date: August 1, 2027** → **$249 / $29 / $25 Standard · $12 / $18 / $119 Side Action · lift $39**.
- Center / org quotes stay custom; the Aug 1, 2027 list increase is a negotiation anchor, not an automatic self-serve change for custom deals.
- Monthly → $29 makes full-year monthly **$348** vs Annual **$249** — keeps annual as the better full-year deal.
- Pass $20 → $25 if mix is healthy. Break-even vs Annual stays ~10 tournaments. Mid-volume upgrade pressure still needs Annual-only value (seats, reports, future fee features), not price math alone.
- Floor = Stripe (~2.9% + $0.30) + allocated support + a slice of always-on AWS (~$105–140/mo after the 5s CloudFront live poll). See `LIVE_SCORES_CDN_ARCHITECTURE.md`.

### Grandfathering (locked)

- **List-price increase (tentative):** **August 1, 2027**
- **Lock-in deadline:** Subscribe **before August 1, 2027** to lock in your subscription price.
- **Duration:** Locked rate lasts **at least one additional year** (through at least **August 1, 2028**).
- Applies to **Standard and Side Action** Season and Monthly rates the customer is on when they lock in.
- After the lock window ends, renewals move to then-current list prices unless a later promo says otherwise.
- Center / org custom quotes are negotiated separately (may include their own term length).

### Tournament credits (locked)

- TDs **may pre-purchase** single-tournament licenses as **credits** and apply them to tournaments as needed.
- One credit unlocks one tournament (same billable unit as a single-tournament purchase). Same 500 unique cap; lift is a separate SKU.
- Credits do not replace Annual/Monthly for unlimited concurrent run rights — they are à-la-carte unlocks.
- **No expiration at this time.**
- **Always record purchase date** (and ledger metadata) so a future expiry or promo rule can be added without reconstructing history.

### Who pays (locked — launch)

- **Bowler / entrant entry fees:** between the **bowler and the TD** only. Victory is a **recording surface** for those amounts at launch — **we do not collect or accept fees from entrants** at this time (no bowler checkout / platform take-rate yet).
- **Tournament access licensing:** the **TD** pays — active Annual/Monthly, **or** a tournament license/credit when not subscribed. Cap lift is extra on that tournament.

### Referral codes (locked)

- Every TD gets a **referral code** generated on their profile.
- Code generation may use the TD’s **USBC ID** as the basis (stable, recognizable); exact format TBD with eng (normalize / prefix if needed for uniqueness and readability).
- **Qualified referral:** a **new TD** signs up with the code and **pays for at least**:
  - **1 month** of subscription (Monthly), **or**
  - **1 tournament** license/credit
- On each qualified referral, the **referrer** may **claim one bonus** (their choice):
  - **1 free month** of subscription, **or**
  - **1 tournament license/credit**
- **Cap:** max **6 claimed bonuses per calendar year** per referrer.
- Referral codes apply to **Standard TD access purchases** (Annual/Monthly/tournament credits), not org custom quotes, cap lifts, or **Side Action SKUs** (pass, monthly, season — too cheap to farm).

Open refinements (do not block the rule above):

- Does “1 free month” apply only to Monthly, or also extend Season by ~1/12?
- Must the referrer claim manually, or auto-grant into a bonus wallet?
- Does the referred TD get any discount, or is the benefit referrer-only?
- If USBC ID is missing at profile create, fallback code algorithm?

### Refunds (locked)

| Product | Refund rule |
|---------|-------------|
| **Unused tournament credits** | **Automated refunds** allowed |
| **Unused Side Action credits** | **Automated refunds** allowed (same as tournament credits) |
| **Subscriptions (Standard or Side Action annual / Monthly)** | **No self-serve refund** of prepaid time without escalation. Customer may **cancel**; access continues through the **end of the prepaid term**, then stops |

Escalation path (support / admin) can still issue subscription refunds in exceptional cases; that is not a customer self-serve promise. Cap-lift refunds: treat like unused credits if the lift was never applied; if applied to a tournament that already exceeded 500 unique, no self-serve refund.

---

## Open product rules (still needed before build)

1. ~~What counts as one billable unit~~ — **Tournament** (locked)
2. ~~Pre-pay gate surface~~ — bowlers/scores + **live viewer** locked; side-action setup / reports OK (locked)
3. ~~Archive rights~~ — licensed history accessible indefinitely to TDs + participants; re-edit OK with active access (locked)
4. ~~Grandfathering~~ — subscribe before **Aug 1, 2027** → lock rate through at least **Aug 1, 2028** (locked, date tentative)
5. ~~Tournament credits~~ — pre-purchase + apply; no expiry now; always store purchase date (locked)
6. ~~Refunds~~ — unused credits automated; subscriptions cancel at term end, no self-serve refund without escalation (locked)
7. ~~Who pays~~ — TD pays access; entrant fees bowler↔TD only; no entrant fee collection at launch (locked)
8. ~~Referral codes~~ — per-TD code (USBC-based); qualified pay → referrer claims free month **or** tournament credit; max 6 claims / calendar year (locked)
9. ~~Center / org quotes~~ — **manual**; launch work = advertise Contact us (locked)
10. ~~Year-1 list prices~~ — **Standard $20 / $25 / $199 · Side Action $10 / $15 / $99 · 500 unique · $25 lift** (SA subs locked 2026-09-02; Stripe remap still TODO)
10b. ~~Side Action entitlements~~ — create-time `sa_only` shell + SA monthly/annual; see `GO_LIVE_MASTER_TODO_2026-07-30.md`. Build leftover: Stripe SKUs for SA pass/month/season.
11. Integrity safeguards for fake scores / average inflation
    - ~~Report UI~~ — bowler profile **Report** (intentionally inaccurate scores) → pick participated event + reason (locked)
    - ~~Admin surface~~ — Victory admin dashboard report queue (see go-live **1c**)
    - Score audit trail — **optional / not go-live**
    - **ToS / legal alignment** — desk-reviewed 2026-08-30; checklist in `GO_LIVE_MASTER_TODO_2026-07-30.md` §1 integrity + §4a; counsel before go-live
12. Victory admin dashboard metrics set (confirm MVP strip vs full list in go-live **1c**)
13. Do locked subscription rates also lock Monthly↔Season switches at the grandfathered amounts?
14. Referral refinements (same Stripe project as Checkout): Annual vs Monthly free-month, claim UX, referred-TD incentive, USBC-less fallback
15. Unique-cap enforcement + lift Checkout SKU + free USBC pass + two admin-comp Annual seats (not built)

---

## Messaging sketch

> **Year-1 pricing:** Standard — $199/year · $25/month · $20 per tournament. Side Action — $99/year · $15/month · $10 per SA-only tournament.  
> Self-serve tournaments include 500 unique bowlers; **$25** lifts one tournament to 2,000. Bigger than that: contact us.  
> **Centers & organizations:** Contact us for multi-user pricing.  
> List prices may increase **August 1, 2027** (Standard $249/$29/$25; Side Action $119/$18/$12; lift $39).  
> **Subscribe before August 1, 2027** to lock your subscription price for at least one more year.  
> Pre-purchase tournament credits anytime (no expiry); unused credits are refundable.  
> Entry fees stay between bowler and TD — Victory records them; we don’t collect entrant payments at launch.  
> Refer a new TD: when they pay for a Standard month or tournament, claim **1 free month** or **1 tournament credit** (max 6 claims per calendar year).  
> Create your tournament for free — unlock with Standard Annual, Monthly, or a tournament pass. Side Action line for weekly walk-in pots.  
> Verify a USBC ID for one free **Standard** tournament pass (once per ID).

Keep the story simple: two lines — **Standard** for full tournaments; **Side Action** for weekly pots-only. Pass for one night; monthly when you run every week; season when you do it all year.
