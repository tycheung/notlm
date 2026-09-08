# Victory Bowling — Go-Live Master To-Do

**Date:** 2026-07-30  
**Audience:** Product + engineering (shareable working list)  
**Status:** Draft planning list — not a committed delivery schedule

Near-term focus should stay on the three highest launch-risk buckets:

1. Payments / pricing
2. Permissions and audience design
3. Format + side-action test matrix

---

## 1. Payments and pricing

- [x] Define launch access pricing (see `LAUNCH_PRICING_2026-07-31.md`)
- [x] Lock billable unit = **Tournament** + pre-pay gating (create OK; bowlers/scores blocked)
- [x] Lock gate surfaces: live viewer paid; side-action setup + reports OK while locked
- [x] Lock archive: licensed history accessible indefinitely to TDs + participants; re-edit with active access
- [x] Lock grandfathering: subscribe before **Aug 1, 2027** → lock rate through at least **Aug 1, 2028**
- [x] Lock tournament credits: pre-purchase + apply; **no expiry now**; always store **purchase date**
- [x] Lock refunds: unused credits automated; subscriptions cancel at prepaid term end (no self-serve refund without escalation)
- [x] Lock who pays: **TD** pays access license/sub; entrant fees are bowler↔TD only; **no entrant fee collection** at launch
- [x] Lock referral codes: per-TD profile code (USBC-based); qualified referral pay → claim **1 free month** or **1 tournament credit**; **max 6 / calendar year**
- [x] Center / Organization: **manual quotes**; product work = **advertise** “Contact us” on pricing (no self-serve quote engine)
- [ ] Stripe integration for **TD access billing** (Season / Monthly / tournament credits) — not entrant checkout yet. **Single project:** Checkout, webhooks, pricing UX, bowler→TD upgrade, referrals, and Billing Portal ship together.
  - [x] Domain models + unlock service + gating hooks (off by default; see `TD_ACCESS_BILLING_2026-07-31.md`)
  - [ ] Stripe Checkout + webhooks — **owned by developer (their task list)**
  - [ ] Pricing / purchase UI — coordinate with Stripe owner (or do copy/CTA separately)
  - [ ] **Bowler path to upgrade to paid TD** — self-service: register as bowler → purchase Season/Monthly/credit → promote role to TD + route to `/director` (today admin-only role change; payment does not grant TD access)
  - [ ] **TD accessibility to pricing and payments** — in-app links to `/pricing`, account billing/subscription status, Stripe Billing Portal, checkout return UX (footer/home/director nav; today only tournament lock banner + direct URL)
  - [ ] **Referrals (same Stripe project)** — wire end-to-end with Checkout + webhooks (BE models + `GET/POST /billing/referral*` stubs exist; no FE, no payment qualification yet)
    - [ ] Referral code at Checkout / signup (per-TD USBC-based code)
    - [ ] Qualified referral detection on webhook (new TD pays ≥1 month or ≥1 tournament credit; SA-only does not qualify)
    - [ ] Referral claim wallet / ledger + annual cap enforcement (grant free month or tournament credit; max 6 / calendar year)
    - [ ] Account billing UI — show code, pending qualified referrals, claim CTA
    - [ ] Referral refinements: free-month vs Season, claim UX, referred-TD perk?, no-USBC fallback
  - [ ] Remap catalog cents + Stripe Price IDs to year-1 list ($199 / $25 / $20)
  - [ ] Unique-participant cap (500) + large-cap lift Checkout SKU ($25 → 2,000)
- [x] **Side Action pass** create-time `sa_only` shell (2026-08-29) — product + gating shipped; Stripe Price ID still with the billing owner.
- [x] **Copy tournament** (2026-08-30) — with roster / blank roster; desk-check A21.
- [ ] Rename customer-facing “Event” SKU → “Tournament” in pricing UI/copy
- [ ] Confirm Aug 1, 2027 remains final (currently tentative)
- [x] Pricing page / marketing CTA for Center & Organization contact — `/pricing` form emails `admin@victorybowling.com` (2026-08-29). No quote engine.

### Launch pricing (locked 2026-08-16)

Year-1 list (see `LAUNCH_PRICING_2026-07-31.md`). Checkout still uses intro cents until Price IDs are remapped.

| Plan | Year-1 list | Aug 1, 2027 target |
|------|-------------|--------------------|
| Season (annual) | $199 | $249 |
| Monthly | $25 | $29 |
| Tournament pass | $20 | $25 |
| **Side Action pass** | **$10** | **$12** |
| **Side Action monthly** | **$15** | **$18** |
| **Side Action season** | **$99** | **$119** |
| Large cap lift (500 → 2,000 unique) | $25 | $39 |
| Center / Organization | Contact us (multi-user, case-by-case) | Contact us |

Self-serve tournaments include a **500 unique-participant** cap (unique people, not entries). Lift is per tournament and does not unlock a locked event by itself.

### Billable unit + gating (locked)

- **One Tournament** = one billable single-license / credit unlock
- Before pay: create tournament + details + competition event(s); side-action setup OK; reports OK
- Blocked: bowlers / scores; **live viewer / public live links**
- Unlock: Season/Monthly **or** that tournament’s single license/credit
- Archive: prior licensed tournaments stay accessible indefinitely (TD + participants); re-edit when access is active again

### Grandfathering, credits, refunds, who pays, referrals (locked)

- **Aug 1, 2027** list-price increase (tentative); subscribe before that date to lock rate ≥1 year (through at least Aug 1, 2028)
- Pre-purchase **tournament credits**; apply as needed; **no expiry**; record purchase date
- **Unused credits:** automated refunds
- **Subscriptions:** no self-serve refund without escalation; cancel → access through end of prepaid term
- **Entrant fees:** bowler ↔ TD only; Victory records, does not collect
- **Access fees:** TD pays subscription or tournament credit/license
- **Referrals:** each TD gets a profile code (USBC ID basis); new TD pays ≥1 month or ≥1 tournament → referrer claims free month **or** tournament credit; **max 6 claims / calendar year**

### Open questions

- Referral: does free month extend Season, or Monthly only?
- Referral: manual claim vs auto wallet?
- Referral: any perk for the referred TD?
- Referral: code if no USBC ID yet?
- Is Aug 1, 2027 final?
- Monthly↔Season switches at grandfathered rates?
- Side Action pass: difference-only upgrade ($10 more → full tournament) vs pay a full $20 pass (MVP = full pass, no credit for the $10)

**Before go-live (legal):** ToS / Privacy / Refund alignment — desk-reviewed 2026-08-30; **continue product testing**; implement + counsel sign-off before launch (see §1 integrity + §4a).  
**Center / org:** quotes stay manual. `/pricing` form emails `admin@victorybowling.com` (desk-check A18). No self-serve quote engine.

### Side Action pass (locked 2026-08-29 — create-time shell)

Customer name: **Side Action pass / Side Action monthly / Side Action season**. Engineering: `tournament_licenses.kind=sa_only` + `tournaments.is_sa_only`. Standard Season / Monthly include full side actions and free-upgrade existing SA shells. Side Action line is for TDs scoring only pots/brackets in Victory — especially **weekly walk-in house events**.

**SKUs (locked 2026-09-02)**

| SKU | Price | Who |
|-----|-------|-----|
| Side Action pass | **$10** one-time | Try-once, one-off night |
| Side Action monthly | **$15/mo** | Weekly walk-in (break-even vs 2 passes) |
| Side Action season | **$99/yr** | Year-round pots-only (~10 passes) |

SA subscription unlocks unlimited **create-as-SA-only** tournaments while active. Does **not** unlock full tournaments — buy Standard pass/sub for that.

**Create-time product (not a convert-later SKU)**

- Dedicated create: **“Side action only tournament.”** Token / license is **owned and applied when the event is created**. Never convert a full tournament backward to SA-only. Never apply $10 to an existing fat tournament.
- Auto shell: **one event**, **one qualifying round**, **one squad**. Only format knob at create: **number of games**.
- **Singles vs teams at setup** (team brackets allowed). Still one qualifying round; `team_size` changes.
- Extra squads are **not** in this SKU. Early/late league is **Copy tournament** (with roster / blank roster) — queued next, not this pass.
- **No public share; participants only.** Not publicly listed; no spectator live hub. Approved participants + TD can see side actions. Hide Make public / public live.
- **Hide** prize fund config entirely (not greyed). **Hide** Format Editor, Standings, Lane assignment tabs. **Grey** competition reports with upsell copy. **Keep** Event Roster + Side Action Financials + SA reports (signup/collection).
- Event roster still required for setup/collection/signups. House-average **+** still used to **pull in** entering averages.
- **Game Scoring** tab stays (same pinfall grid) with a clear **“for side actions only”** banner.
- Game count: **cannot edit event games while a side action still references those game numbers** — error telling them to edit that SA first.
- 500 unique cap still applies.

**Upgrade is one-way to full**

- User wants scores to **start counting** (averages + recorded games) once upgraded. Do not stamp games as forever excluded.
- **Becoming a subscriber (Season/Monthly) free-upgrades existing SA-only events** (no extra $20).
- Tournament pass / credit on that tournament also upgrades. MVP still pay full $20 with no $10 credit (Stripe later). Difference-only $10 upgrade SKU is a later nicety.
- After upgrade: prize fund, extra events/squads/rounds, Format Editor, standings, lanes, and public share become available; games feed averages on recompute.

**How it differs from “locked tournament” today**

| State | What you can do |
|-------|-----------------|
| Unpaid / locked (full tournament) | Create tournament + events; **SA setup only**. No roster, so you cannot take entries, generate, settle, or show live SA. |
| **Side Action pass ($10), created as SA-only** | Restricted shell + roster + run SA (signup, generate, lock, settle, SA reports). **Not** publicly listed. Pinfall is input to score-based SA only. |
| Tournament pass / Season / Monthly | Full unlock (bowlers, scores, live results, SA included). Subscribing also upgrades existing SA-only shells to full. |

**Cost** (Stripe SKU still parked)

| | Year-1 | Aug 1, 2027 |
|--|--------|-------------|
| Side Action pass | **$10** one-time per tournament | **$12** |
| Side Action monthly | **$15/mo** | **$18** |
| Side Action season | **$99/yr** | **$119** |
| Pre-purchase | SA-only credits, same rules as tournament credits: **no expiry**, store purchase date | |
| Unused SA credits | Automated refunds | |
| Who pays | **TD** (bowler SA entry fees stay bowler↔TD; Victory records, does not collect) | |
| 500 unique cap | Still applies to the roster; **$25** lift to 2,000 still available (does not unlock a locked tournament by itself) | |
| Referrals | SA SKUs do **not** qualify a referral (too cheap to farm). Free USBC trial is a **Standard** tournament pass, not Side Action. | |
| Standard Season / Monthly | Include SA on full tournaments; free-upgrade existing SA-only shells to full. | |

Rationale: must stay **below** the $20 tournament pass so “I only need pots” is a real choice, and **well below** Monthly ($25) so it is not a weekend sub substitute.

**Included (`sa_only`)**

- Add / approve participants (roster is required to sell entries and take SA signups)
- Side action setup, signup, generate, lock, settlement, SA reports / SA financials
- Pinfall entry **only as input to score-based SA** (high game / high series / eliminator, etc.)
- House-average lookup to fill entering average (games themselves do **not** feed averages until upgrade)
- SA **financial** history on the bowler (money still records)

**Not included**

- Extra events, extra rounds, extra squads
- Format Editor, event standings, prize fund, event financials, score sheets as a scored tournament
- Public listing / Make public / spectator live hub — **participants only**
- Lane assignment / movement
- **Bowler averages / Stats games** — SA-only games do **not** feed trusted averages or the Stats games grid until the event is upgraded to full

**Build leftovers**

- Stripe Price ID + catalog cents for SA-only credit (define with Stripe owner; not this step)
- Pricing page SKU copy
- Copy tournament (with roster / blank roster) — **shipped 2026-08-30** (desk-check A21)

### Copy tournament (locked 2026-08-29 — shipped 2026-08-30)

Primary use case: **early/late league** — same house + format + SA setup, optionally the same field, as a **new billable tournament**. Also works for full multi-event tournaments.

**UI (locked)**

- Button on tournament page → Events card → beside **Add Event** (`EventList.tsx`). Mobile: same action from tournament header.
- Modal: **Copy with roster** | **Copy with blank roster** + editable name (default `Copy of {source name}`).
- **Dates:** leave empty / TBD on the copy. If a field is required to save (e.g. event start), the TD must enter it before the copy completes — do not auto-copy source dates.
- New tournament opens after copy (navigate to first event, or tournament overview if blank roster + no dates).

**Variants (locked)**

| Variant | Roster | Use case |
|---------|--------|----------|
| **Copy with roster** | Approved event participants (+ teams for team events) | Early/late league, same field |
| **Copy with blank roster** | Empty | Same setup, new field |

**License / product mode (locked)**

- New tournament = **new billable unit** (new `tournament_licenses` row).
- Source `is_sa_only=true` → copy stays **SA-only** (`kind=sa_only`, `is_sa_only=true`). Source full → copy stays **full** (`kind=full`). **Never** full → SA-only.
- SA-only copy still = one event / one qualifying round / one squad (same shell rules as create).
- Gating: copy succeeds only when the organizer can create/run the new tournament (gating off locally, active sub, or unused credit — same as create). Stripe SKU for SA-only copy is still parked.

**What copies — tournament level**

| Copies | Does not copy |
|--------|----------------|
| Name (prefixed default), description, rules, location, bowling center, `lanes_reserved`, `lane_management_settings`, `official_flg` | `start_date` / `end_date` / `registration_deadline` (TD sets fresh or leaves empty) |
| `is_sa_only` flag (from source) | Source license, payments, Stripe ids |
| New organizer = acting TD | Co-owner rows, event delegations, abuse reports |
| Optional metadata: `copied_from_tournament_id` (audit) | Scores, games, published/live state |

**What copies — every event in source (full or SA-only)**

| Copies | Does not copy |
|--------|----------------|
| Event name, format (`singles`/`teams`, `team_size`), handicap settings, DYLG, re-entry rules | `published_at`, `completed_at`, check-in timestamps |
| Prize fund **config** (house cut, lineage, added money, duplicate-cashing policy) — **skip entirely when source is SA-only** | Actual payouts, championship placements, standings |
| Lineage config (`lineage_fee_mode`, per-game/flat amounts, billed games) | Lane assignments, game scores |
| Signup **policy** shape (`signups_manually_closed`, scheduled open) — reset to **closed** on copy | `current_entries` counts (recomputed from roster) |
| Full **format structure**: rounds, squads, final nodes, relationships (empty shells — no scores) | Match-play series results, bracket winners |

**What copies — roster (with-roster variant only)**

| Copies | Does not copy |
|--------|----------------|
| Event participants: `user_id`, **approved** status, `qualifying_average`, `handicap`, `is_youth`, `is_senior`, `notes` | `checked_in`, payment fields, `entry_number` > 1 re-entries (copy as fresh entry 1 only) |
| Teams + team members (team events), team names/numbers | Parent re-entry team links |
| Tournament-level `tournament_participants` rows for copied users (approved) | Pending / withdrawn registrations |

**Blank-roster variant:** structure + config only; zero participants/teams; `current_entries=0`.

**Side actions (locked 2026-08-29)**

- Copy each source **side action definition** as a new row in **`DRAFT`** status (fees, game numbers, handicap/scratch, bracket/pot config blobs).
- **Do not copy:** entries, pools, generated brackets, results, payouts, check-in state, partner pairings (Alibi), rollover ticket state.
- Tournament-level **SA templates:** **not** in MVP (TD re-applies from library if needed). Only per-event draft SAs copy.

**Scope (locked)**

- **Any** tournament (SA-only or full). Copy **all active events** and their structure. SA-only source → still one event; full source → all events.

**API shape (engineering)**

- `POST /api/v1/tournaments/{id}/copy` body: `{ name, include_roster: bool, event_dates?: { event_id: { start_date, end_date } } }` — dates only when required fields block create.
- New service `services/tournament_copy.py` (do not overload `create_sa_only_shell`).
- Response: new tournament id + first event id for navigation.

**Out of scope:** Stripe checkout for copy, public listing on SA-only copy, copying runtime SA money, copying across organizers, “merge into existing tournament”.

**Start-here files**

- FE: `EventList.tsx`, `TournamentDetails.tsx`, copy modal (new)
- BE: `services/tournament_copy.py`, `routes/tournaments.py`, tests `tests/unit/test_tournament_copy.py`

---

## 1b. Data integrity & abuse

Risk: fake tournaments / scores used to inflate averages or history.

### Report abuse UI (locked — direction)

- Lives on **Stats → bowled event history** (primary) and still on the bowler **profile** page.
- Small **Report** control with short copy explaining it is for reporting **intentionally inaccurate scores**.
- Flow when used:
  1. Bowler opens **Report** on an event they have scores in
  2. A **text dialog** asks for a description of the problem (event is already tagged)
  3. Submit creates a report for Victory review
  4. Submissions surface on the **admin dashboard** (`/admin` count + `/admin/abuse-reports` queue). **No auto-notify to the TD on submit.**

**Who can file (locked 2026-08-29):** **approved participants on that event only** (Stats → Report and the profile form). Spectators, other TDs, public, and Victory filing on someone’s behalf are out for launch. One open report per event per reporter; 5 per 24 hours.

**Notify the reported TD (locked 2026-08-29):** **no** on submit. If anyone talks to the TD, that is an **admin choice after review**, not an automatic email or in-app ping.

### Score audit trail — optional / think about later (not go-live)

**Not required for go-live** — volume concern (every score write = another row). Revisit if abuse volume or disputes need stronger evidence.

If revisited later: append-only change log (actor, before/after, game ids, source, timestamp). Until then, triage uses current scores + report text + deep links into the event.

### Still to design / build (go-live relevant)

- [x] Primary report entry point: Stats event history → Report → description dialog (profile form still available)
- [x] Admin dashboard (see **1c**) including report queue
- [x] Who else can report — **participants only** (approved on that event). Locked 2026-08-29.
- [ ] **Terms of Service / legal pages alignment** (evaluate before go-live; **counsel review**) — desk-reviewed 2026-08-30; continue QA/testing meanwhile (`TermsOfService.tsx`, `RefundPolicy.tsx`, `PrivacyPolicy.tsx`)
  - **P0 — accuracy vs launch product**
    - [ ] Remove/limit platform **entrant fee collection** language (ToS §5.3–5.4, §4.1; Refund Policy §1, §6) — locked: bowler↔TD only at launch; Victory records amounts, **no entrant checkout**
    - [ ] Rewrite **TD access** as license/unlock, not subscription-only (free create + setup; Season / Monthly / tournament credit / Side Action pass unlock; link `/pricing`, `/refunds`)
    - [ ] Clarify **prize tracking/reporting** vs actual payouts (TD responsibility; Platform does not disburse)
  - **P1 — risk reduction**
    - [ ] **Victory average / not-USBC** disclaimer (not certified book average; TD-entered qualifying averages)
    - [ ] **Public display of results** consent (names/scores on public/live when TD publishes)
    - [ ] **Score-integrity suspension** — strengthen §6 (participant-only reports; Victory may investigate/suspend without auto-notifying TD on submit)
    - [ ] **Governing law** — replace vague jurisdiction placeholder (counsel picks state/entity)
    - [ ] **Cross-doc consistency** — Privacy “process tournament payments”; Refund in-app “Request Refund” vs product reality
  - **P2 — when features ship**
    - [ ] Referral program terms
    - [ ] Side Action pass + participant caps + grandfathering in legal copy
    - [ ] Archive/history after access lapse
    - [ ] Minimum age / youth (Privacy has under-13; counsel on ToS)
- [x] Side Action pass games do **not** feed bowler averages / history (locked with SA-only)
- [x] Trusted average vs raw TD-entered data — **locked 2026-08-29** (see below).
- [x] TD house averages — grid on `/director/averages` + roster + picker (2026-08-29).
- [x] Notify reported TD? **No on submit.** Admin may contact after review. Locked 2026-08-29.
- [ ] Optional later: USBC / sanction linkage, verification badges, anomaly detection
- [ ] Optional later: score audit trail (see above)

**Trusted Victory average (locked 2026-08-29):** lifetime, rolling **365 days**, 90-day, and last-50 from individual regulation games on **active** events. Baker and team shells are out. Deleted events stay hidden on Stats and do not feed these numbers. Not a certified / USBC book average — no verification badge and no USBC average integration. Side Action pass games stay out until the event is upgraded to full (then they start counting).

**TD house averages (locked 2026-08-29):** TDs type qualifying average (USBC, other orgs, prior tournaments — their call). Product help is lookup, not a USBC feed.

1. **House averages** (`/director/averages`) — filterable grid of bowlers on events **this TD organized**. Columns: last entering avg used, highest avg used, **TD avg** (games on this organizer’s active events only), **Center avg** (— until a bowling center is chosen; then games at that house on this TD’s events), lifetime Victory avg. Center filter also limits the list to bowlers who have been on events at that house. Name links to bowler lookup.
2. **Roster +** — next to the qualifying-average box, pick last entering / highest used / TD avg / **center avg (this event’s bowling center)** / lifetime / higher of last vs TD into the field (no typing). Picks use the **event organizer’s** house book so assistants see the same numbers.

**Next product item after copy tournament desk-check:** Stripe Price ID for the $10 SA pass stays with the billing owner.

---

## 1c. Victory admin dashboard (go-live)

**Access:** Victory **admin** role on your personal login (platform admin), not tournament-director capabilities. Single private ops surface.

### 1) Abuse report review

Turn bowler Report submits into a queue:

| Need | Detail |
|------|--------|
| Queue | Open reports, newest first; filter `open` / `in_review` / `resolved` / `dismissed`. **Default needs-review (open + in review); cap cue when more than 100 match (2026-08-28).** |
| Detail | Reporter, selected event + tournament links, reason text, created at. **Admin links: tournament, live/standings, event standings, game scoring, bowler profile (2026-08-28).** |
| Context | Deep link into that event’s scoring/standings (no audit trail required for MVP) |
| Actions | Mark in review; dismiss + note; resolve + note / outcome |
| Notes | Admin-only internal notes |
| Outcome | Short line for why dismissed / what was done (2026-08-28). Stored on the report snapshot; notes stay separate. |
| Snapshot (nice) | Event name + key scores at submit time so later edits don’t erase context. **Review pane shows score count + complete-at-submit (2026-08-28). Actual game list still not stored.** |

### 2) Subscription & platform stats

Business / health metrics on the same dashboard (read-only aggregates).

**Billing / access (once Stripe + licenses exist)**

| Metric | Notes |
|--------|-------|
| Active Season subscriptions | Count (and optionally MRR/ARR later) |
| Active Monthly subscriptions | Count |
| Outstanding unused tournament credits | Purchased − applied − refunded |
| Credits applied (period) | This week / month / all-time |
| New paid TDs (period) | First qualifying payment |
| Referral claims used (period) | Toward the 6/year cap |
| Churn / cancels scheduled | Subs canceling at term end |
| Grandfathered vs list-price subs | After Aug 1, 2027 especially useful |

**Tournament / competition volume**

| Metric | Notes |
|--------|-------|
| Tournaments in system | Total + created in period |
| Tournaments unlocked / “runnable” | Licensed or covered by active sub |
| Events in system | Competition events under tournaments |
| Games in system | Scored and/or shell games — define which |
| Unique bowlers | Distinct users who have participated |
| Active tournaments (in progress) | Useful ops pulse |
| Finished tournaments | Archive volume |

**Other unique / high-signal metrics worth including**

| Metric | Why it’s useful |
|--------|-----------------|
| TDs with ≥1 paid unlock | Conversion from account → paying |
| Free-created tournaments never unlocked | Funnel leak / tire-kickers |
| Avg tournaments per paying TD | Season vs credit mix |
| Side actions created / completed | Product adoption beyond core scoring |
| Reports open / resolved (period) | Abuse load |
| Top centers / states by tournaments | Geo / GTM signal if you have location data |
| Team vs singles event mix | Format adoption |
| Median games per event | Complexity / load proxy |
| Assistant / delegated TD seats in use | Multi-user demand → org pricing signal |
| Live viewer sessions (if tracked later) | Engagement; not needed day one |

**Launch MVP stats cut (recommended)**

1. Active Season + Monthly counts  
2. Unused tournament credits outstanding  
3. Tournaments / events / games totals  
4. Unique bowlers  
5. Open abuse reports count (badge into the queue)  
6. Paying TDs (all-time or trailing 30 days)

Charts can wait; start with a simple metric strip + tables.

### Permissions note

- Dashboard routes: **admin-only**
- Do not expose these aggregates to tournament directors or bowlers  
- Prefer server-side aggregates (SQL counts) over shipping raw tables to the client

---

## 2. Feature readiness

- [x] Review current event formats; identify any missing go-live formats — **inventory 2026-08-29:** none missing (see checklist below). **Test each** stays on the testing list.
- [x] Review current side actions; identify any missing go-live side actions — **inventory 2026-08-29 (updated):** Alibi Doubles restored as a live chosen-partner pot (ADR-0006). **Test each** stays on the testing list.
- [x] **Youth prize funds / SMART / mixed teams** — product is the roster review flag only (2026-08-27). TD owns Youth checkbox, mixed-team decisions, and SMART vs cash. No product enforcement of payouts or mixed-team blocks.
  - **Roster review flag:** team-event participant management shows an amber “Review youth eligibility” chip (with birthdate + age) when the bowler’s profile DOB makes them **21 or under** as of event start. Does **not** auto-check Youth.
- [x] Finish report additions beyond Standings (print reports landed; Excel + report matrix still open below)
- [ ] Create a report matrix: audience, trigger, scope, columns, and export rules (spec, not a new report type). **Draft 2026-08-28** in `REPORT_MATRIX_2026-08-28.md` — review, then lock. No product changes until review.
- [x] **Excel standings export** — event reporting (CSV that Excel opens: current/final standings from Reports + Standings tab)
- [x] **Excel scores export (all rounds)** — event reporting (CSV of all entered scores across rounds)
  - **Bowler history:** Scores and Financials tabs export the on-screen grid as Excel CSV. Scores CSV includes Place / Pinfall / HCP (2026-08-28).
- [x] Event create/edit: **Scratch vs Handicap** (event-wide; side actions keep their own mode)
- [x] **Baker / Standard game style + DYLG on round config** (`competition_method_config`; DYLG removed from event create)
- [x] **DYLG scoring:** honor `dylg_enabled` / `dylg_scope` / `dylg_drop_count` on Qualifier pinfall totals (Format Editor toggle is Qualifier-only; H2H strips)
  - **Locked (2026-08-27).** Round scoring only. All games stay stored for history, side actions, and the standings **average** (average uses **all** games). The pinfall **total** is what drops. SA pots never inherit the drop.
    - **Individual:** each bowler drops their own lowest game(s); teammates may drop different game numbers; then sum those series for the team.
    - **Team:** sum members into a team game first, then drop the lowest team-game total(s).
    - **Where it applies:** **Qualifier / Eliminator pinfall rounds only** (`competition_method=eliminator` — “bowl N, rank by total”). Not offered on heads-up methods: bracket, stepladder, round robin, pods. Strip/hide on those; do not persist `dylg_*` there.
    - **Baker:** allowed on those qualifying rounds. Baker is **team scope only** (drop N Baker team games from the series). Individual scope is hidden when `game_style=baker`.
    - **Drop count:** TD-configurable integer, **default 1**. Simple stepper/field when DYLG is on. Cap at `game_count − 1` (cannot drop the whole series). Rarely used; keep the control small.
    - **Handicap:** per-game handicap is the same number every game (scratch varies). Dropping a game drops **that game’s scratch and that game’s handicap**. 4-game drop-1 → 3 games of handicap, not 4. Scratch and handicap totals stay aligned to the same game numbers.
    - **Live / incomplete:** do **not** drop until the configured series length is in. After 1/2/3 of a 4-game drop-1, standings show the sum of all games bowled so far; after game 4, drop. Mark the current low game(s) on sheets/standings (bold or color) even mid-series — that is the candidate to drop.
    - **Ties for lowest:** drop the **first** (lowest game number). Total is the same either way.
    - **Not** `team_scoring_method=sum_best_n` (that drops a *bowler*).
  - **Examples**
    - Singles 200 / 150 / 180, drop 1 → round total **380**. Average still uses all 3.
    - HC 20/game, 4 games 200 / 150 / 180 / 170, drop 1 (150): total = 200+180+170 + 20×3 = **610** (not ×4).
    - Doubles A 200/150/180 + B 190/210/160, drop 1: individual **780**; team-scope **750**.
    - Team games 350 / 450 / 520 / 380, drop 1 → **1350**.
    - Baker qualifying, 4 games 700 / 650 / 820 / 710, drop 1 → **2230** (drop 650).
  - **Definition complete** for engine + Format Editor. Engine + Qualifier UI landed 2026-08-27 (standings, live scores, reports markers).
- [x] **Round robin bonus pins (win/tie/loss)** + flow-arrow criteria **Total Pinfall with Bonus Pins** (wired in standings/advancement; RR no longer overrides ranking with W–L seed order)
- [x] **Classic stepladder** (lowest seeds open; climb to #1) + **match decision** (fixed games total vs race-to / best-of) for stepladder, bracket, pods, and round robin; games-per-match field editable while typing
- [x] **Elimination Order** advancement criterion for stepladder / bracket / pods → finals (rank by when eliminated; champion first). Available on any flow arrow; default for those H2H sources into a final node.
- [ ] **Lane assignments: copy from another round** — implemented (Copy onto this round + Stamp game lanes); **needs desk check**, not a greenfield build
- [x] **RR league matchplay (Baker-style) — dedicated RR config UI** when format = round robin (shipped; **desk-check A12**)
  - Schedule source = USBC league table for entrant team count (same tables as lane movement)
  - `scheduled_games` = first K weeks of that table (e.g. 32 teams / 16 games → weeks 1–16; 32 teams / 32 games → weeks 1–31 then wrap week 1 as game 32)
  - Match shells from league weeks (not truncated all-vs-all); lanes + matchups share the week index
  - Match decision / bonus pins stay on this panel
  - Format Editor: league vs pairwise, scheduled games, position round, lane placement. Mid-event insert refuses a scored game; Lock CTA fills 1v2 / 3v4… from standings and stamps position-round lanes.
- [x] **Insert position round (RR)** — setup-time primary; mid-event OK if it does not touch scored games (shipped; **desk-check A12**)
  - Always pair **1v2, 3v4, 5v6…** by current standings (pinfall + bonus when configured)
  - Insert at game K **replaces** that scheduled league week
  - Ending after last game is valid (e.g. insert at 32 with 32 games → no leftover wrap)
  - Position-round **lane placement**: random | start low end | start high end | start middle (applied on Lock / stamp, not only preview)
- [x] **H2H format config UI** — dropped as a dedicated build (2026-08-28). Format Editor Matchups already has desks for RR, bracket, pods, and stepladder. Further polish is discovered in testing, not a fifth panel.
- [ ] **Pods / Beat the pair** — Format Editor desk shipped; **QA matrix still open** in `FORMAT_PODS_BEAT_THE_PAIR_HANDOFF_2026-08-17.md`
- [x] **Rollover button for brackets** — bowler-level **Roll** on Side action signups (per set, pick destination sets); unused finite tickets roll on generate; linked sets batch-generate. **Needs QA.**
- [x] **Financials: break out lineage vs expenses / house cut** (separate config + reporting lines; do not lump lineage into a single house-cut bucket)
- [x] **Lineage fee modes:** per-game (auto-calc from configured round game counts × approved bowlers) **or** flat total amount
  - **Ship risk (2026-08-25):** lineage/prize/lane/report edits are still **uncommitted** on `feat/role-dashboards` — do not treat as in `main` until that work is committed (do not commit `.env.development` or Alembic feature revisions).

### Team side action (locked 2026-08-25 — HG/HS/Eliminator scoring shipped 2026-08-26; team brackets shipped 2026-08-26)

**Not a new type.** There is no “TEAM” in `SideActionType`. Team pots are `type_config.entry_unit: bowler | team` (default bowler) on existing types. Customer copy: **Who enters this pot?** Bowler vs Team (`EntryUnitConfigSection`).

Team = **event roster teams** (`EventParticipant.team_id` / team shells). Not Mystery Doubles pairs (MD still manufactures doubles from bowler tickets).

| Type | Config toggle | Signup (team line vs bowler line) | Scoring |
|------|---------------|-----------------------------------|---------|
| High Game | Yes (hidden on singles) | Yes — exclusive cells | **Member-sum** of individual games (shells ignored) |
| High Series | Yes (hidden on singles) | Yes — exclusive cells | **Member-sum per game**, then existing series (sum / best_n) |
| Eliminator | Yes (hidden on singles) | Yes — exclusive cells | **Member-sum** of individual games (shells ignored) |
| Brackets | Yes (hidden on singles) | Yes — exclusive cells | **Member-sum** of individual games (missing member = 0); team is the entrant |
| Mystery Doubles | No | n/a | Stays bowler-entry by design |
| Love Doubles | No | n/a | Stays bowler-entry by design (cartesian male × female) |

**Rules**

- One ticket per team; any rostered member can hold it. Unteamed bowlers cannot enter. “All Sidepots” does not mass-enroll team pots per bowler.
- **Team score = sum of the team’s member scores** for the games / series the pot uses (a 5-man team bracket game is five individual scores added together). Not Baker 0–300 as the product default.
- Mixed events: individual pots enter on the **bowler** line; team pots enter on the **team** line. Same column is never editable on both.
- Standings list **team names**. **Cash settlement** still points at the ticket-holder user (Victory does not split the envelope among teammates). **Same-day payee label** for team-pot cash is the **team name**, not the signer.
- Hide Team toggle on **singles** events (no event teams).
- Scratch vs handicap still per-SA.

**Same-day payout report (locked 2026-08-26)**

Team-pot entered + won print on the **team** as payee. Individual pots stay on the **bowler**. Never mix team-pot cash onto a bowler line.

- **Alphabetical:** Teams list (A–Z) then bowlers list (A–Z) — never mixed A–Z.
- **Grouped by team:** team line first (team pots), then that team’s bowlers (their individual pots only), then the next team. Unteamed bowlers after all teams.

Example (doubles, grouped by team):

```
Team BowlerA/Bowler B
  Side Action Entered $100    ← team pots
  Side Action Won     $300
Bowler A
  Side Action Entered $50     ← individual pots
  Side Action Won     $25
Bowler B
  Side Action Entered $300
  Side Action Won     $475
```

**Bowler history / career records (locked 2026-08-26 — shipped 2026-08-26)**

Do **not** dump team pots into today’s “SA entered / SA won” (those stay **bowler-pot only**).

Add **Team Side Action Entered** and **Team Side Action Won** on **every** rostered teammate, using the **full team amounts**. Hover on either team figure: equal split **team amount ÷ that event’s team size**, copy **`$X per team member`**. Stored/career team totals stay the full team figure.

Same doubles example — Bowler A’s history card:

```
Side Action Entered:        $50
Side Action Won:            $25
Team Side Action Entered:   $100   hover: "$50 per team member"
Team Side Action Won:       $300   hover: "$150 per team member"
```

Bowler B’s individual SA entered/won stay $300 / $475; the two Team lines are the **same $100 / $300** (same hovers).

**Still to build**

- [x] **Team brackets (locked 2026-08-26 — shipped 2026-08-26).** Same 8-seat engine as bowler brackets; the **entrant is the event team**. Signup is the **one team-line quantity** (already exclusive cells). Product lock:
  - Treat like individual brackets with the **team** as the bowler: quantity 2 = two seats across generated pots, **never two seats in the same 8**. Same bye options (none / fill one / specific). Same game window, handicap, generate, conflict rules — identity is the ticket-holder `user_id` (one holder per team), not each teammate.
  - Match score = **member-sum** of that game’s individual pins (not Baker shells). A missing member counts as **0** (TD miss, DQ, quit) and the team still bowls. Same missing=0 rule as HG / HS / Eliminator.
  - **Signup and same-day payouts** are attributed to the **team name**. The desk signer is the team. Individuals appear only on **history** (Team SA entered/won on every rostered member). Ledger may still store a holder `user_id` for the ticket row.
  - **Rollover** only into other **team** bracket sets. Leftover count is the team’s leftover tickets.
  - Tree, alive list, and bracket print: **team name only** (no member names on the label).
  - Mystery Doubles stays bowler-only.
- [x] **Scoring engines (HG / HS / Eliminator):** rank **member-sum** of rostered members’ individual games for team pots (Baker / team shells ignored). Missing member counts as **0**. Handicap = sum of member ranking scores. Shipped 2026-08-26. Team brackets use the same missing=0 member-sum (shipped 2026-08-26).
- [x] Live spectator / bowler SA board + HG / HS / Eliminator print reports show **team names** for team pots (`display_name` from engines; name column labeled Team). Spot-checked 2026-08-26.
- [x] Mystery Doubles stays bowler-only (do not add Team). Locked; not a remaining build.
- [x] **Love Doubles** — cartesian male × female pairs; selected games; scratch/handicap; Mystery Doubles print kit (2026-08-28). Bowler-only. Desk-check with other SA types.
- [x] Individual / other SA reports: how team pots appear vs bowler pots (payout sheet layouts shipped 2026-08-25; HG/HS/Eliminator standings reports use team names 2026-08-26). Same-day grouped layout already prints team pots on the team line then members underneath — keep that as the grouped-by-team rule (2026-08-26 lock).
- [x] **Bowler history: Team SA entered / Team SA won.** New lines on every rostered teammate with the **full** team amounts. Existing SA entered/won stay bowler-pot only. Hover on **both** team figures: `$X per team member` (amount ÷ event team size). Career totals keep the four buckets separate. Shipped 2026-08-26.

**Team labels (platform — not side-action-specific)**

- [x] **Auto team names when blank.** If TD leaves `team_name` empty, join **every** roster last name in order with `/` — doubles `Smith/Jones`, five-man `Smith/Jones/Lee/Park/Kim`, same rule at every team size. `Team {number}` only when there are no last names. Used on roster, standings, reports, lanes, live scores, and side-action team pots. Shipped 2026-08-26.

### Report track

Full catalog (PDF + Excel, no exclusions) is drafted for review in `REPORT_MATRIX_2026-08-28.md`. Audience lock: Victory admin + TD; bowlers get views plus Stats Scores/Financials Excel only. Do not change product until that review.

| Window | Report | Notes |
|--------|--------|-------|
| Done / hardening | Standings | Mid-event snapshot = Final (as far as progressed) or Specific round; cut/cash line toggle |
| Done | Event Roster (+ check-in) | Desk roster; optional check-in columns (SA signup sheet is SA-only) |
| Done | Single Game Results | One exact game; standings layout; handicap/team/bowler options that apply to one game |
| Done | Prize Fund | Configured place amounts; event + tournament scope. Mid-event = amounts only (no names). |
| Done | Score Sheets | Traditional landscape grid; ≤8 games/page; bowler/team/pair; individual + team HCP toggles |
| Done | Event Financials | Non-side-action settlement (entries, house, lineage, prizes). Lineage is its own line. |
| Done | Side Action Financials | Overall SA settlement only (no bowlers). Per pot: intake / fees / payouts / refunds. Tournament = section per event. |
| Done | Lane Assignment / movement-derived sheets | Layout A is in Event Reports; Lane tab has extra PDFs |
| Done | Lane Pair Conflicts print | Event + Tournament Reports (A14). Event menu filters to rows that touch that event. |
| Done | Stepladder diagram print | Event/Tournament Reports when a stepladder round exists; Format Editor Print stepladder (A14). |
| Done | Bracket Conflicts print | SA Conflicts modal Print (A14). Bracket financials modal stays on-screen (use SA Payout).
| Done | Excel standings export | CSV (Excel-friendly): Reports menu + Standings tab |
| Done | Excel scores export (all rounds) | CSV of entered scores; bowler history grids also export |

### Suggested format / side-action checklist shape

Inventory **2026-08-29** (name missing types only; no test pass). Nothing new to build for launch types.

**Event shells:** Singles and Teams (`team_size` covers doubles through five-man). Scratch vs handicap is event-wide. Baker vs standard is per round. DYLG is qualifier pinfall only.

**Competition methods (Format Editor desks exist):** Qualifier/eliminator pinfall, round robin (+ league table + position round), bracket, pods / beat the pair, classic stepladder. Flow arrows: top-N, elimination order, total pinfall with bonus pins.

**Side actions:** Bracket, High Game, High Series, Eliminator, Mystery Doubles, Love Doubles, Alibi Doubles. Team entry unit on Bracket / HG / HS / Eliminator (hidden on singles). MD, Love Doubles, and Alibi Doubles stay bowler-only.

**Not missing types — parked as QA (testing list):** TEAM pots/brackets, bracket rollover, pods matrix, lane copy-from-round.

**Not go-live (do not add unless asked):** Scotch doubles restore, no-tap pots, bumper, 9-pin, dark-horse, extra doubles flavors.

| Item | Go-live? | In product | Notes |
|------|----------|------------|-------|
| Singles event | Y | Yes | |
| Teams event (2–N) | Y | Yes | Auto names `Last/Last` |
| Qualifier pinfall + DYLG | Y | Yes | Qualifier rounds only |
| RR / league / position round | Y | Yes | Desk-check A12 |
| Match-play bracket | Y | Yes | Baker overlay + diagram |
| Pods / beat the pair | Y | Desk shipped | QA matrix open |
| Classic stepladder | Y | Yes | Print A14 |
| SA: HG / HS / Eliminator / Bracket | Y | Yes | + team unit |
| SA: Mystery Doubles | Y | Yes | Bowler-only, draw |
| SA: Love Doubles | Y | Yes | Cartesian, no draw |
| SA: Alibi Doubles | Y | Yes | Chosen-partner pairs; 1 fee per pair; ADR-0006 |

---

## 3. Viewer and role experience

**Status:** Live package + financial visibility **locked** (2026-07-31) — see `VIEWER_LIVE_AND_FINANCIALS_2026-07-31.md`. Live IA + spectator SA (incl. brackets) + prize/SA money polish shipped.

- [x] Decide TD identity display: legal name, display name, public-facing label
  - Display name is optional on the TD profile. Public label is **Display (Legal name)** so the legal name is never hidden. Surfaces: tournament lists, tournament page, reports, TD search, admin user list.
- [x] Design what non-TDs can view for **live** events (package locked; implement)
- [x] Design what non-TDs can view for **finished** events (retention / depth still open; financials rules apply)
  - **Locked 2026-07-31** — see Finished-event viewer below
- [x] Design bowler history view (what they can see about their own past) — Stats summary + bowled-event grid + games grid
- [x] Audit role/capability boundaries for TDs, bowlers, and public viewers
  - 2026-08-01 audit + 2026-08-02 P0 fixes: pool money strip, tournament master IDOR, anon Live optional-auth, event-list unpublished/prize redact (`PERMISSIONS_AUDIENCE_AUDIT_2026-08-01.md`)
- [ ] **Mobile-friendly design (all surfaces)** — phone layouts for TD, bowler, admin, live viewer, scoring, and reports. Impacts everything; not a one-off home “today card.”
- [ ] **Mobile views review** — desk-check phone layouts across the real flows (TD scoring/desk, bowler home + live, public tournament, reports). Feeds the mobile-friendly workstream above; not a home-only pass.
- [ ] **Published event review** — walk a TD-made-public tournament as anon, logged-in non-participant, and entered bowler: findability, `/tournaments/{id}` (info / live / SA), money strip, private vs public. Separate from Make public wording (shipped 2026-08-28).
- [x] **Wording: “Publish” vs “Make public”** — TD copy is **Make public / Make private** (2026-08-28). API flags stay `publish` / `unpublish`. Per-event findability + live; does **not** open sign-ups or complete the event.
- [ ] **Update logo with the new polished logo throughout the platform** — replace the current mark (`Logo.tsx`, `custom-victory-logo.svg`, favicon in `index.html`) on headers, login, admin/TD chrome, and print/report headers. Needs the final asset.
- [x] **Dashboard review — TD, Bowler, Admin** (home/landing dashboards: IA, primary CTAs, what’s missing vs ops/viewer needs)
  - **TD (`/director`) — done 2026-08-24** (Happening Today / Coming Up / delegated / pending links / server-side my-tournaments / completed collapse). Unlock/license parked for Stripe. Nice-to-haves 16–18 skipped.
  - **Bowler (`/dashboard`) — done 2026-08-25** for the numbered home pass (1–15, 17). **16** Report a score is on Stats event history (admin queue). **18** mobile is the overall workstream above, not a home-only card. **17** no in-app bowler payments — entry fees stay TD↔bowler.
  - **Admin (`/admin`) — done 2026-08-25** for the numbered home pass. Happening Today / Coming Up, grant-credits search, bowler lookup, TD impersonation, system-status click-in, tournament TD column/filter. Skipped queue-first home, abuse/Actions Needed home cards, vanity-stat demotion. Activity-log deep links left out (no ids). Financials dashboard parked with Stripe. **18** mobile is the overall workstream above.
  - **Desk-check still open** (verify-only canvases; seed dates currently hide Happening Today / Coming Up / In Progress)
- [x] **Implement live viewer IA:** tournament results → multi-event picker → round/squad/overall → live SA → bowler drill-down
  - TournamentDetails `?tab=live` hub + event picker; Event Side Action tab public board; RoundLiveScoresModal bowler → SA outcomes sheet
  - 2026-08-02: bowler view Event Info / Results (standings + SA live list / brackets) polish on public tournament path
- [x] **Financial visibility (slice 1):** SA standings open to live viewers with $ stripped for non-participants; prize-fund public toggle (default off); prize-distribution gated; final-payouts amounts stripped when not entitled
  - Event complete: redacts house cut / add-on (entry fee always public); SA list/detail/signup-board strip fee+rake for non-participants

### Live viewer package (locked)

1. Up-to-date tournament results  
2. Select event if multiple  
3. Select round / squad / overall by format  
4. View live side actions  
5. Click bowler → active SA + individual SA results (**no $** unless viewer is a participant)

### Financial visibility (locked)

| Rule | Detail |
|------|--------|
| SA for non-participants | Outcome only (e.g. 2nd in HG pot, 23 brackets won) — **no dollar amounts** |
| Prize fund public toggle | **Default off** — only participants see prize fund; if on, public can view |
| Participants | Always see own financials + that event’s prize fund / SA / event financials |
| TD delegates | **EVENT_INFO** and/or **GAME_SCORING** grants see prize fund + SA entry/rake/payouts (desk ops). Other caps (squads/lanes/participants/format) alone do not unlock money. |

### Current behavior (summary) — gaps vs locked package

| Surface | Today | Target |
|---------|--------|--------|
| Live (non-TD) | Event info + full live scores modal; little SA live | Tournament-scoped results + scope pickers + live SA + bowler SA drill-down |
| Money | Prize/SA $ often visible or login-gated inconsistently | Strip $ for non-participants; prize fund gated by toggle (default off) |
| Finished | Published forever; mixed depth | **Locked:** forever while published; same as live; Complete event when rounds done; `/tournaments/{id}`; manual unpublish near Share |
| TD identity | Display name (optional) + legal name on lists, tournament page, and reports | Shipped 2026-08-26 |

### Finished-event viewer (**locked** 2026-07-31)

| # | Decision | Lock |
|---|----------|------|
| A | **Retention** | **Forever while published** (no time-box) |
| B | **“Finished” cue** | When **all rounds are done**, tournament page prompts TD with **Complete event** |
| C | **Public depth** | **Same as live** package (results + SA + bowler drill-down; money rules unchanged) |
| D | **Share / access URL** | Keep working; primary public access is **`/tournaments/{tournamentId}`** (Live via `?tab=live`; optional `&eventId=`) |
| E | **Make private** | **Manual only**; lives with tournament Share & visibility (peer to Share) — not auto |

**Notes:** TD/participant archive entitlement from pricing still applies. Completing an event is a TD action (not auto-private). Make private clears public access until made public again.

- [ ] **Deleted event with completed scoring** — **tabled 2026-08-29** (no lock yet). Options parked below. Today: Delete sets `is_active=false`; bowler Stats **omit** inactive events, so a spite delete already hides history even though rows remain.

#### Deleted vs test/bogus (parked — do not build until locked)

**Problem:** one Delete button serves two opposite jobs. (A) Real scored event — spite, misunderstanding, abuse — bowlers own the record. (B) Genuine test/bogus — empty or dummy data that should vanish.

**Today:** soft hide (`is_active=false`). Data stays. Stats / public / TD list drop it.

**Options (not chosen):**

1. **One Delete, scored events stay on bowler records** — Withdrawn for TD/public; Stats keep the row (“Director removed this event”). A fully scored “test” still lands on Stats.
2. **Block Delete once any game is completed (or SA entered)** — only Make private / Complete. Simplest anti-spite. Empty shells can still Delete.
3. **Two buttons: Discard vs Withdraw** *(leaning, not locked)* — Discard only if no completed games (and maybe never public). Withdraw = scored/published: desk + public gone; bowler + admin + abuse snapshots stay.
4. **Practice flag at create** — test events never feed averages/Stats; Delete = discard. Official uses Withdraw. Lock the flag once a game is completed.
5. **Admin / cooling-off** for scored deletes — heavy for launch.

**Open calls (when this comes back):** (1) Line = one completed game, vs anyone else on the roster? (2) Withdrawn events count in average, or Financials only? (3) TD restore Withdraw, or admin only? (4) Practice at create for v1, or only Discard-when-empty?

A fully scored Saturday with real people is **not** test data. Discard should not apply.

---

### Still open (viewer)

- Bowler history depth beyond live drill-down — **shipped 2026-08-28**: Stats event rows include place / pinfall / HCP; row opens live standings; Financials SA amounts open a per-pot pop-out. **2026-08-29:** live pot winnings (HG / HS / Eliminator / Mystery Doubles / Love Doubles) use the same `payouts_by_user` SSOT as the same-day payout sheet (not the retired results table).
- Display name vs legal name for TD
- **Mobile views review** (phone desk-check of real flows)
- **Published event review** (public published tournament as anon / stranger / participant)
- Lane sheets for viewers? (not in locked live package)
- Anonymous vs logged-in non-participant: assume same strip rules unless changed
- Participants: live while tournament still locked? (today: no; not changed by this lock)
- **Deleted event with completed scoring** (added 2026-08-28) — **tabled 2026-08-29**; options parked on the checkbox above. Not the same as Make private / finished retention.

---

## 4. Launch operations

- [ ] Go-live regression checklist by format, side action, role, and report
- [ ] **Day-of QA** from `SESSION_HANDOFF_TEST_TODO_2026-08-13.md` (Baker brackets A1–A3, reports A4, lanes copy A6, SA templates A7, bracket rollover A8, **TEAM sidepots + team brackets A9**, **SA gender/age eligibility A10**, **Excel/CSV exports A11**, **Baker RR league + position round A12**, Love Doubles A15, Stats Financials A16, **load test A17**, **Center/Org contact form A18**, **Alibi Doubles A19**, **TD house averages A20**, youth-review roster chip, Leading Lady Trios event 6 board)
- [ ] **Load test (A17)** — large event (hundreds of bowlers), hundreds of brackets, combo formats + many side actions on one event; score save / standings / live / reports still usable
- [ ] Desk-check TD `/director`, bowler `/dashboard`, and admin `/admin` homes (implementation done; verify-only)
- [ ] Expand seed/demo data so every key format and report path has realistic coverage
- [ ] TD support docs / internal runbooks (payments, refunds, scoring, reports)
- [ ] **TD feature request flow** (evaluate later) — in-app path for tournament directors to suggest new formats, side action types, or product capabilities. Today: no form or admin queue; only manual email to `support@victorybowling.com` (Footer mailto / legal pages). Not the abuse-report or center/org pricing forms.
- [ ] Launch monitoring for payment failures, registration failures, scoring/report errors

---

## 4a. Legal pages (ToS / Privacy / Refunds)

**Status:** Desk-reviewed 2026-08-30 against launch pricing + product. **Continue testing**; implement edits + counsel sign-off before go-live. Full checklist under §1 integrity → **Terms of Service / legal pages alignment**.

**Already aligned:** bowler free tier; TD cancel / prepaid term; score manipulation prohibited (§7); investigation rights (§6); standard IP/liability/indemnity; links to Privacy + Refunds; `support@victorybowling.com`.

---

## Suggested additions (beyond original list)

| Priority | Item | Why |
|----------|------|-----|
| P0 | ToS / Refund / Privacy alignment vs launch product | Entrant fees, TD unlock model, payouts, averages — desk-reviewed 2026-08-30; counsel before go-live |
| P0 | Permissions / audience audit | Launch risk is often “wrong thing shown to wrong person,” not a missing feature |
| P0 | Cross-feature regression matrix | Formats, side actions, reports, and roles now overlap enough that ad hoc testing will miss blockers |
| P0 | Score integrity / fake-average safeguards | Participants-only Report + admin queue; **no TD notify on submit**. Victory averages = lifetime / 365 / 90-day / last 50 from active events (no USBC). TD qualifying average still open. |
| P0 | Victory admin dashboard | Report triage + subscription/volume metrics on personal admin login |
| P1 | Demo / seed data expansion | Local DB has already blocked real team-score smoke tests |
| P1 | Support and ops runbooks | Refunds, disputes, and “what happened?” paths need documented answers |
| P1 | Dashboard review (TD / Bowler / Admin) | **Implementation done 2026-08-25**; desk-check still open |
| P1 | DYLG scoring engine | Qualifying pinfall only (not H2H). Drop N (default 1); Baker = team-scope. HC excluded on dropped games; average = all games; SA pots raw. Engine + Qualifier Format Editor landed 2026-08-27. |
| P1 | Day-of QA (SESSION_HANDOFF_TEST_TODO) | Baker brackets, reports, lanes, rollover, **TEAM sidepots + team brackets (A9)**, **SA gender/age eligibility (A10)**, **Excel/CSV exports (A11)**, **Baker RR + position round (A12)**, Love Doubles A15, Stats Financials A16, load test A17, Center/Org form A18, Alibi Doubles A19, TD house averages A20, event 6 board — built, never run as a block |
| P1 | Wording: “Publish” vs “Make public” | **Shipped 2026-08-28.** TD copy is Make public / Make private; API still publish/unpublish. |
| P1 | Mobile-friendly design (all surfaces) | Phone layouts for every role and flow — scoring, live, dashboards, reports. Not a single home widget. |
| P1 | Mobile views review | Desk-check phone layouts on TD, bowler, public live, and reports — the review pass, not just the design workstream. |
| P1 | Published event review | Walk a published tournament as anon, stranger, and participant (findability, live, SA, money). |
| P1 | New polished logo throughout | Swap the current mark on headers, login, chrome, favicon, and print/report headers. Blocked on the final asset. |
| P1 | Youth prize funds / SMART / mixed teams | **TD-owned.** Product is the roster review chip only (2026-08-27). No SMART payout engine or mixed-team block. |
| P2 | TD feature request flow | Evaluate later — structured in-app path for format / side-action / product asks (today: email support only) |
| P2 | Lane assignments: copy from another round | Mixed-scoring events often reuse the same pairings across regular → Baker rounds |

---

## Suggested sequencing

### Phase 1 — Launch risk

1. Stripe direction + fee structure decisions
2. Permissions / viewer-surface rules
3. Format and side-action inventory review

### Phase 2 — Product depth

1. Referral / discount code rules
2. Bowler history experience
3. Additional report types (Single Game, Prize Fund, Score Sheets)

### Phase 3 — Rehearsal

1. Regression matrix execution
2. Support runbooks + monitoring
3. Final seed-data expansion and launch rehearsal

---

## Already landed (context for go-live planning)

Useful so we do not re-scope work that is already in `main`:

- Event / tournament **Standings** reports (with follow-up auth + tie ranking hardening)
- Mystery Doubles
- Love Doubles (cartesian male × female; 2026-08-28)
- Bracket All / All Sidepots
- Large brackets print chunking + scale path
- Full-event simulation e2e suite (12 format scenarios)
- Stronger Cursor / CI vibe-ship gates for agent-driven ships

---

## How to use this doc

- Check boxes as decisions land or work ships
- Add owners and target dates in a follow-up pass if useful
- Keep product decisions (fees, refunds, audience) ahead of implementation where possible

---

## Deferred (end of list — revisit after launch-risk items)

- [ ] **Single-tournament license integrity** (anti-reuse) — product rule TBD; prevent unlocking one tournament then constantly renaming/redating it
  - Candidate: freeze event/tournament dates once scores exist and/or a round is completed
  - Stronger candidate: freeze at unlock; new weekend = new tournament = new credit (or active Season/Monthly)
  - Optional: freeze tournament name after unlock (or allow typo-only edits)
  - Parked: think through freeze timing before build

**Slice plan (2026-09-04):** See `docs/go-live/MATURITY_AND_BACKLOG_SLICES_2026-09-04.md` � reopen webhook (#49), plan-aware unlocks (#50), pass consume (#51), `/users/me` role strip (#52).
