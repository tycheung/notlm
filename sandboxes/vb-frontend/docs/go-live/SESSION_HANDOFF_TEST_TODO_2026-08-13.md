# Test plan + go-live todo handoff — 2026-08-13

**Pairs with:** `SESSION_HANDOFF_DEV_2026-08-13.md`  
**Master backlog:** `GO_LIVE_MASTER_TODO_2026-07-30.md`  
**Full regression workbook (Excel):** `GO_LIVE_FULL_REGRESSION_CHECKLIST_2026-08-30.xlsx` (611 rows · 7 sheets — regenerate via `python scripts/generate_go_live_regression_checklist.py`)  
**Report spec:** `REPORT_MATRIX_2026-08-28.md`  
**Local:** FE `http://127.0.0.1:5173` · BE `http://127.0.0.1:8000` · `td@example.com` / `password123`  
**Primary fixture:** Leading Lady Trios — event **6**, Qualifying **14**, Match Play Finals **15** (Baker, 16-team SE)

Use the **Excel workbook** as the master pass/fail log (every module, format, side action, report, and permission surface). This file keeps prioritized integration flows (§ A) and planning backlog (§ C–D).

---

## B — Master regression workbook (2026-08-30)

Open `GO_LIVE_FULL_REGRESSION_CHECKLIST_2026-08-30.xlsx` at the repo root. Sheets:

| Sheet | What it covers |
|-------|----------------|
| **Modules_Views** | Every route/page: auth, public, bowler, TD, admin, mobile |
| **Permissions** | Role × surface matrix (master, assistants per capability, bowler, anon, locked, SA-only) |
| **Formats** | Eliminator, stepladder, bracket, RR+position, pods × singles/teams × score types |
| **Side_Actions** | All 7 SA types × bowler/team variants × lifecycle (create → payout) |
| **Reports** | Every PDF/CSV from `REPORT_MATRIX_2026-08-28.md` × allowed roles |
| **Integration_Flows** | Handoff § A1–A21b end-to-end smoke entries |
| **Cross_Cutting** | Billing/gating, publish, signup, re-entry, CI guardrails |

**Columns to fill:** `Status` (Pass / Fail / Blocked / N/A), `Tester`, `Date Tested`, `Notes`.  
**Priority:** run all **P0** rows first, then P1, then P2.

CSV copies (one file per sheet): `GO_LIVE_FULL_REGRESSION_CHECKLIST_2026-08-30_csv/`

---

## A — Must test from this push

### A1. Team handicap + standings cut
- [ ] Team standings show non-zero **HCP** when members have handicap (parent row rollup).  
- [ ] Qualifying → finals **top N** relationship marks **Advance** through cut (event 6: after 16th).  
- [ ] Print Standings with cut line toggle matches board.

### A2. Format Editor — bracket generate / view / print
- [ ] Generate seeded single-elim for Baker trios does **not** fail with match-play game-count / team_size errors.  
- [ ] **View bracket** layout: Round of 16 → Quarterfinals → Semifinals → Final; connectors center later rounds.  
- [ ] **Print bracket** / viewer Print preview → PDF/HTML; landscape for 16-team field; names + winners when scored.  
- [ ] Double-elim (if configured): separate pages/sections for winners / losers.

### A3. Baker bracket scoring → next round (critical)
- [ ] Game Scoring for Match Play Finals opens **bracket diagram**, not full team×game sheet.  
- [ ] After Round of 16 scores (diagram **or** legacy Game 1 team sheet), winners appear in quarterfinals.  
- [ ] Quarterfinals with both sides filled show editable Baker score boxes.  
- [ ] Tied matches show **Tied — pick winner**; picking a side seats that team.  
- [ ] Format Editor does **not** need a separate “advance” action for in-bracket rounds.  
- [ ] Score correction that changes winner clears / reseats downstream (spot-check one match).

### A4. Event reports menu
- [ ] Standings / Single Game / Prize Fund / Score Sheets / Lane Assignments / Event Financials / SA Financials / Event Roster configure + preview.  
- [ ] **Lane Pair Conflicts** Preview (A14). Event menu = rows that touch this event; tournament menu = all events.  
- [ ] **Stepladder diagram** only if a round is stepladder (A14). Hidden otherwise.  
- [ ] **Excel — Standings** and **Excel — Scores** Download at the top of the Reports menu (detail in A11).  
- [ ] Standings **QR poster** is on Event / Tournament **Share**, not this menu (A13).  
- [ ] Roster preview still works after Lane Assignments was inserted above it in the menu.  
- [ ] Baker-only events: “individual scores on team standings” stays disabled with helper text.

### A5. Roster demographics / USBC (if shipping in same PR)
- [ ] Edit gender / DOB from Participants table; persists after refresh.  
- [ ] Assign real USBC for temporary IDs.

### A6. Lanes (if shipping in same PR)
- [ ] Copy lane assignments from another round.  
- [ ] Pair conflict highlight / sheets report preview.

### A7. Side-action templates (if shipping in same PR)
- [ ] Save / apply user SA templates from TD tools.  
- [ ] Eliminator cut schedule modal still loads.

### A8. Bracket rollover (bowler-level)
- [ ] Signups grid: each bracket cell has **Roll** next to **All** (not in TD bracket setup).  
- [ ] Enter tickets, enable Roll, pick destination sets (e.g. 1-3 scratch → 4-6 scratch, not handicap).  
- [ ] Unused tickets from that bowler only move into the chosen set on generate.  
- [ ] Mutual case: bowler A scratch→handicap and bowler B handicap→scratch; **Lock & Generate linked sets** on the squad; both overflows can create pots.  
- [ ] Apply DB migration `20260817_entry_rollover` if signups 500s on missing `rollover_enabled`.

### A9. TEAM sidepots and team brackets
Use a **team event** (not singles). Mystery Doubles, Love Doubles, and Alibi Doubles stay bowler-only — do not add Team there.

**Toggles + entries**
- [ ] Bowler vs Team toggle on High Game, High Series, Eliminator, and Brackets. Hidden on a singles event.  
- [ ] Team copy is member-sum (one seat per event team; 5-man high game = five scores added).  
- [ ] Mixed event: individual High Game **and** TEAM High Game. Signups grid shows a **team line** then nested bowlers.  
- [ ] Team-pot columns take entries on the team line only; individual pots on bowler lines only (never both).  
- [ ] Same for TEAM brackets vs individual brackets on one event. Unteamed bowlers cannot enter team pots.

**Payout report**
- [ ] Team-pot cash (including team brackets) prints on a **Team** line, not on the ticket-holder bowler.  
- [ ] **Alphabetical:** Teams list A–Z, then Bowlers list A–Z — never one mixed A–Z list.  
- [ ] **Group by team:** team name as header, bowlers underneath. With header payouts: Team 1 $200 then members. Without: header is name-only.  
- [ ] Team-pot columns show $ on Team rows only (em dash on bowler rows); individual pots the reverse.

**Live / standings (spot-check)**
- [ ] Team pots list **team names** on live SA / standings, not only the holder’s name.

**Known gaps — still exercise and log**
- [x] Team **brackets** generate / seating / scoring — team is the entrant (ticket-holder `user_id`); match score is member-sum (missing = 0); labels are team names; rollover only to other team sets (2026-08-26).  
- [x] HG / HS / Eliminator team scoring is **member-sum** of individual games (missing = 0); shells / Baker ignored (2026-08-26).  

### A10. Side-action eligibility by gender and class
Restrictions apply to **every** SA type. Checked groups are **OR’d** (Women + Senior = any woman or any senior). Youth is a **roster flag**, not an age cutoff. Senior is a roster flag, on by default when the bowler account is 50+.

- [ ] Config form “Who can enter this pot?” shows Men/Women and Youth / Open adults / Senior (no youth age cutoff).  
- [ ] Women-only: uncheck Men (leave class boxes on). Male seniors stay out.  
- [ ] Women + Senior: uncheck Men, Youth, and Open. Male seniors **and** non-senior women can enter.  
- [ ] Seniors-only: only Senior checked. Requires the roster Senior toggle (DOB alone is not enough).  
- [ ] Youth-only: only Youth checked. TD must mark Youth on the participants list.  
- [ ] Participants list has Youth / Senior checkboxes. Senior defaults on when account age is 50+.  
- [ ] Team pot: every rostered teammate must match at least one checked group.
- [ ] Team event roster: amber **Review youth eligibility** chip when profile DOB is **21 or under as of event start** (shows birthdate + age). Does **not** auto-check Youth.

### A11. Excel / CSV exports
CSV with UTF-8 BOM (opens in Excel). Unique filename so an open workbook is not overwritten.

- [ ] Event **Reports**: **Excel — Standings** Download — current/final place board (place, pinfall, handicap, games, prizes). Try event entry and tournament entry.
- [ ] Event **Reports**: **Excel — Scores** Download — every entered score, all rounds, one row per game (`individual` / `team` / `baker`). Empty shells omitted.
- [ ] Event **Standings** tab: **Export Excel** matches the board (scope / basis / game columns).
- [ ] Standings **Configure**: **Export Excel** uses the selected round / squad.
- [ ] Bowler **Stats → Scores**: **Export Excel** matches the games grid (Event, Tournament, Date, Game 1…).
- [ ] Bowler **Stats → Financials**: **Export Excel** matches the financial grid (same `$` / `—` cells).

### A12. Baker RR league + position round (desk-check — build is in)
Format Editor when the round is Round robin. Not a greenfield build.

- [ ] Schedule source **USBC league weeks** vs **Assign manually**. League uses the same week tables as lane movement.
- [ ] **Scheduled games** = first K weeks (e.g. 32 teams / 16 games → weeks 1–16; 32/32 → weeks 1–31 then wrap week 1 as game 32).
- [ ] Generate match shells from those weeks — opponents match the lane-movement week, not a truncated all-vs-all.
- [ ] **Insert position round**: pick game K; that week becomes 1v2, 3v4, 5v6… Last game is valid (insert at 32 of 32).
- [ ] **Lock** (scoring header or break panel) fills sides from current standings (pinfall + bonus). Refuses if that game is already scored.
- [ ] Position-round **lane placement** (low / high / middle / random) stamps on Lock, not preview-only. Spot-check a 32-team field if you have one.

### A13. Standings QR poster (Share — not the Reports menu)
One-page letter poster from Event Share and Tournament Share. Event should be **public** before a phone scan is expected to work. Local URLs stay on `http://127.0.0.1:5173`.

- [ ] Event **Share**: small on-screen QR encodes the tournament **landing** (`/tournaments/{id}`), not Live.
- [ ] Event **Share**: **Print standings poster** → one letter page: tournament name, event, center, dates, **Find standings here**, large QR, URL text, Victory footer.
- [ ] Poster QR / printed URL opens **live/standings** (`?tab=live&eventId=` for that event), not the landing page.
- [ ] Tournament **Share**: same **Print standings poster** (URL is `?tab=live` without a specific event).
- [ ] Phone scan (or paste the printed URL) on a **public** event reaches standings. Private event: TD can still print; anon scan should not show the public board.

### A14. Desk prints — lane pair / stepladder / bracket conflicts
Thorough reporting review comes later. This pass is “does it open.” Skip bracket **financials** modal print (use SA Payout).

- [ ] **Lane Pair Conflicts** from Event Reports: Preview includes full occurrence lists for rows that touch this event (other events on the same pair still listed). Empty sheet is OK if no reuse.  
- [ ] Same report from Tournament Reports covers every event. Tournament-level **EVENT_INFO** assistant (Assistant permissions on the tournament) can run it — no 403. Event-only grant still cannot run the all-events pack.  
- [ ] **Stepladder diagram** appears in Event / Tournament Reports **only** when a round has competition method stepladder. Lowest seeds at the bottom.  
- [ ] Format Editor Matchups → **Print stepladder** on a stepladder round.  
- [ ] SA bracket **Conflicts** modal → **Print**. Honors “show all pairs.” No Print on the bracket financials modal.

### A15. Love Doubles
Cartesian male × female pot (no Draw). Often one game; TD can select a series. Bowler-only.

- [ ] Create Love Doubles: games, handicap vs scratch, places/fees. Gender toggles hidden (both always on). Age classes still configurable.
- [ ] Mixed field: 4 men × 4 women → 16 teams on Standings. Top combo is combined score. Each place splits 50/50.
- [ ] Bowler without male/female on the profile cannot enter.
- [ ] Entry Summary + Love Doubles Report Preview match the Mystery Doubles print kit. Live board has Standings, no Draw.

### A16. Bowler Stats — live SA winnings
Financials must match the same-day payout sheet. Live pots (High Game, High Series, Eliminator, Mystery Doubles, Love Doubles, Alibi Doubles) no longer use the retired results table.

- [ ] Stats → **Financials** for a bowler who cashed those pots: **SA won** equals the payout sheet for that event (Love Doubles / Alibi Doubles = half of each cashed pair; multiple pairs sum).
- [ ] Incomplete / not payout-ready pots show **$0** won (provisional is not history).
- [ ] Team pots: every rostered teammate sees **team SA won**. Mystery Doubles, Love Doubles, and Alibi Doubles stay on the bowler line.
- [ ] **Export Excel** on Financials matches the on-screen SA won / team SA won cells.

### A17. Load test — large event
Desk-check a **big** tournament, not a 16-team fixture. Goal is “still usable,” not a CI k6 suite.

- [ ] **Field size:** hundreds of bowlers (or teams) on one event / several squads. Signup sheet, roster, lane sheets, and standings still open and scroll.
- [ ] **Hundreds of brackets:** many SA brackets (scratch + handicap sets, TEAM brackets if a team event) **and/or** a large event bracket. Generate, view, score one match, Conflicts print, payout sheet.
- [ ] **Combo formats:** same tournament mixes qualifier (RR / position round) → match-play bracket, plus at least one of pods / stepladder / Baker. Advancement, cut line, and the next-round board still match after scores.
- [ ] **Combo side actions:** one event with High Game, High Series, Eliminator, Mystery Doubles, Love Doubles, Alibi Doubles, and (on a team event) TEAM pots + TEAM brackets at once. Live boards, reports, and Stats Financials still match the payout sheet.
- [ ] **Hot paths stay snappy enough to run the desk:** score save, standings refresh, live viewer, report Preview. Note any multi-second hangs or timeouts.

### A18. Center / Organization contact form
Public `/pricing` (no login). Form posts to the API; inbox is `admin@victorybowling.com`. Local DEBUG still returns success if SES is not configured — confirm the success screen, not a real inbox.

- [ ] `/pricing` shows “Contact us about center / organization pricing” plus the form (not a mailto). Copy targets bowling centers, associations, and multi-TD orgs.
- [ ] Required: name, email, organization name, organization type (bowling center / association / multi-TD org / other).
- [ ] Optional: approx directors/users, approx annual events, approx annual participants, phone, notes. Blank numbers are OK.
- [ ] Logged-in TD: name and email prefill from the account. Submit shows a success state.
- [ ] Validation: org type required; number fields reject 0, negatives, and fractions.
- [ ] Honeypot “website” is not shown. Do not fill it.

### A19. Alibi Doubles
Chosen-partner pot on the Love Doubles scoring pattern. One pair = one fee, listed under the signer. ADR-0006. Bowler-only.

- [ ] Create Alibi Doubles: selected games, scratch vs handicap, places/fees, entry limit (`null`/0 = unlimited pairs a bowler can be on as holder or partner).
- [ ] Signer picks partner from the event roster. A/B is the same as B/A (duplicate). One signer with three partners = three fees.
- [ ] Default same-squad. Cross-squad only if allowed and the holder’s squad has not started scoring. A bowler whose **any** squad has started scoring cannot be added as partner from any squad (including later ones).
- [ ] Optional gender/age filters + force mixed / over-under (combinable).
- [ ] Standings = selected games; payout 50/50; fund = pairs × fee. Live board has Standings, no Draw.
- [ ] Dedicated **4-up signup slips** print. Entry Summary + Alibi Doubles Report Preview.
- [ ] Stats Financials SA won for a cashed pair is half the place (same `payouts_by_user` as the payout sheet).

### A20. TD house averages
Lookup + click-to-fill for TD-typed qualifying average. Not a USBC feed. House book is events **this TD organized**. Locked 2026-08-29. Side Action pass create-time shell shipped 2026-08-29.

- [ ] `/director/averages` lists bowlers from events you organized. Filter by name/USBC **and bowling center**. Columns: last entering, highest used, TD avg, Center avg (— until a center is chosen), lifetime, events. Name links to bowler lookup.
- [ ] TD avg uses only individual games on this organizer’s active events. Center avg is the same, limited to the selected house (tournament bowling center). Lifetime is the Victory platform average. Last / highest come from qualifying averages you typed.
- [ ] Roster: **+** next to the qualifying-average box. Picks last entering / highest used / TD avg / **center avg for this event’s house** / lifetime / higher of last vs TD. Fills the field without typing. Works on team and singles rosters.
- [ ] Assistant on someone else’s event sees the organizer’s house numbers, not an empty personal book.

### A21. Copy tournament (locked 2026-08-29 — shipped 2026-08-30, desk-check)
Product lock: `GO_LIVE_MASTER_TODO_2026-07-30.md` § Copy tournament.

**Button home:** tournament Events card beside **Add Event** (`EventList.tsx`).

**Desk-check**

- [ ] Modal: Copy with roster / Copy with blank roster; default name `Copy of …`.
- [ ] Dates empty on copy; TD prompted only when a required date field blocks save.
- [ ] SA-only source → new SA-only shell (one event / round / squad); full source → all events + structure.
- [ ] With roster: approved participants, teams, qualifying averages, youth/senior; no check-in, payments, or scores.
- [ ] Side actions copy as **DRAFT** definitions only (no entries/pools/results).
- [ ] New license row; never full → SA-only.
- [ ] Navigate to new tournament / first event after copy.

### A21b. Side Action pass create-time shell (shipped this session — desk-check)
Create-time `sa_only` shell shipped 2026-08-29. Stripe Price ID still parked.

- [ ] Create tournament → **Side action only** → land on the one event (one round, one squad, game count from create).
- [ ] Hidden: Add Event / Add Squad, prize fund, Format Editor / Standings / Lanes, Make public / public live / Share.
- [ ] Game Scoring banner: pinfall is for side actions only. Reports: competition items greyed; Event Roster + Side Action Financials stay on.
- [ ] Upgrade is POST `/access/upgrade-from-sa-only` (button, or auto-POST when the organizer has Season/Monthly). GET tournament/event complete must not write. After upgrade, games start counting.

---

Current known board state when overlay was applied (re-check after refresh):

- [ ] Round of 16: most matches complete; resolve any remaining **ties**.  
- [ ] Confirm all four quarterfinals eventually have both teams + shells.  
- [ ] Score one QF → winners into semis → score semis → final.  
- [ ] Re-open Format Editor **View bracket** / print — matches scored diagram.

---

## C — Open items from go-live master todo (not claimed by this push)

Copy of still-open / high-value items from `GO_LIVE_MASTER_TODO_2026-07-30.md` for planning the next sessions.

### Payments / pricing — Stripe integration (pending dev; single project)
- [ ] Stripe Checkout + webhooks (developer-owned)  
- [ ] Pricing / purchase UI  
- [ ] **Bowler path to upgrade to paid TD** — self-service role promotion on purchase; today admin-only  
- [ ] **TD accessibility to pricing and payments** — nav to `/pricing`, account billing, Billing Portal, checkout return UX  
- [ ] **Referrals (same Stripe project)** — Checkout code capture, webhook qualification, claim wallet + annual cap, account billing UX (BE stubs only today)  
- [ ] Referral refinements: free-month vs Season, claim UX, referred-TD perk?, no-USBC fallback  
- [x] **Copy tournament** (2026-08-30) — with roster / blank roster; `POST /tournaments/{id}/copy`. Desk-check **A21**.
- [ ] Rename customer-facing “Event” SKU → “Tournament”  
- [ ] Confirm Aug 1, 2027 grandfather date  
- [x] Center / Organization Contact-us CTA on pricing — form on `/pricing` emails admin@victorybowling.com  

### Integrity / admin
- [x] Who else can report abuse — **participants only** (approved on that event). Locked 2026-08-29.  
- [ ] **Terms of Service / legal pages alignment** (counsel before go-live) — desk-reviewed 2026-08-30; **continue testing** meanwhile  
  - [ ] **P0:** entrant fees (no platform checkout at launch); TD license/unlock model; prize tracking vs payouts  
  - [ ] **P1:** Victory average / not-USBC; public results display; score-integrity suspension; governing law; Privacy + Refund cross-doc  
  - [ ] **P2:** referrals, SA pass/caps/grandfathering, archive-after-lapse, youth/age  
- [x] Trusted average vs raw TD data — Victory computed (lifetime / 365 / 90-day / last 50); deleted events excluded; no USBC badge. Locked 2026-08-29.  
- [x] TD house averages — `/director/averages` grid + roster **+** picker (last / highest / TD / lifetime). Locked 2026-08-29.  
- [x] Notify reported TD? **No on submit.** Admin may contact after review. Locked 2026-08-29.  
- [x] Admin abuse-queue polish — deep links, submit snapshot, needs-review default, outcome line + notes (2026-08-28). Subscription volume metrics stay with Stripe.  

### Format / lanes / financials product gaps
- [ ] **Lane assignments: copy from another round** — may be partially implemented in this pile; verify then check off master todo  
- [x] **RR league + position round (A12)** — Format Editor + Lock CTA + scored-game guard shipped; desk-check only  
- [x] Dedicated H2H config UI — dropped 2026-08-28; Format Editor Matchups already covers RR / bracket / pods / stepladder; polish via testing
- [ ] **Pods / Beat the pair** — min/max, advance-by-size, remainder toggle, balance modes, per-pod pinfall cuts, Baker teams (`FORMAT_PODS_BEAT_THE_PAIR_HANDOFF_2026-08-17.md`) — desk shipped; remaining polish TBD  
- [ ] **Team side action (A9)** — TEAM sidepots (HG / HS / Eliminator) + TEAM brackets: toggles, exclusive signup cells, payout layouts, member-sum scoring, and team-bracket generate shipped 2026-08-26. Mystery Doubles, Love Doubles, and Alibi Doubles stay bowler-only. QA still open.  
- [x] **Youth prize funds / SMART / mixed teams** — TD-owned. Product is the roster review chip only.  
- [ ] **Rollover for brackets (QA)** — Side action signups **Roll** next to All; pick destination sets; unused tickets roll on generate; linked sets batch-generate; mutual scratch↔handicap both receive overflow  
- [x] Financials: break out **lineage** vs house cut / expenses  
- [x] Lineage fee modes: per-game vs flat  

### Viewer / roles
- [x] TD identity display name vs legal name — optional profile display name; public label is Display (Legal). Tournament lists, tournament page, reports.  
- [x] Bowler history depth — Stats place / pinfall / HCP, click-in to live standings, SA pot pop-out (2026-08-28)
- [ ] **Report matrix** — audience, trigger, scope, columns, export rules for each print/Excel report. **Draft 2026-08-28** (`REPORT_MATRIX_2026-08-28.md`). **Master pass/fail log:** `GO_LIVE_FULL_REGRESSION_CHECKLIST_2026-08-30.xlsx` (Reports + Permissions sheets).
- [ ] **Deleted event with completed scoring** — **tabled 2026-08-29.** Options in `GO_LIVE_MASTER_TODO_2026-07-30.md` (Discard vs Withdraw, Practice flag, etc.). No lock. Today spite-delete already hides bowler Stats.
- [ ] Mobile live/results layout pass  
- [ ] **Mobile views review** (phone desk-check of TD / bowler / public / reports)  
- [ ] **Published event review** (anon / stranger / participant on a TD-published tournament)  
- [ ] **New polished logo throughout the platform** (headers, login, favicon, print/report headers; needs final asset)  
- [ ] Dashboard review — TD, Bowler, Admin  

### Launch ops
- [ ] Full regression matrix by format × side action × role × report — **workbook shipped 2026-08-30** (`GO_LIVE_FULL_REGRESSION_CHECKLIST_2026-08-30.xlsx`)
- [ ] **Load test (A17)** — large event, hundreds of brackets, combo formats + side actions  
- [ ] Expand seed/demo data for every key path  
- [ ] TD support runbooks  
- [ ] **TD feature request flow** (evaluate later) — in-app path for format / side-action / product asks; today email `support@victorybowling.com` only  
- [ ] Launch monitoring (payments, registration, scoring/report errors)  

---

## D — Suggested next work order (after this push)

1. **Desk-check Copy tournament (A21)** — with roster / blank roster on full + SA-only sources.  
2. QA TEAM sidepots + team brackets (A9) on a team event (mixed individual + team pots; payout Alphabetical vs Group by team).  
3. QA bracket rollover (A8) on a two-set scratch/handicap event.  
4. Finish Baker bracket day-of QA on event 6 (A3 + B).  
5. Confirm lane copy-from-round against master todo checkbox.  
6. Desk-check Baker RR league + position round (A12) — build is in; not a new feature.  
7. Desk-check standings QR poster (A13) from Event + Tournament Share.  
8. Desk-check Lane Pair Conflicts, Stepladder diagram, Bracket Conflicts Print (A14).  
9. Desk-check Love Doubles (A15) — cartesian male×female; reports + live.  
10. Desk-check Stats Financials (A16) — live SA winnings vs payout sheet for HG / HS / Eliminator / MD / Love Doubles / Alibi Doubles.  
11. Desk-check Center / Organization contact form (A18) on `/pricing`.  
12. Desk-check Alibi Doubles (A19) — chosen partners, freeze, 4-up slips, reports + live.  
13. Stripe / billing track (blocked on developer Stripe ownership) — **single project:** Checkout, webhooks, referrals, bowler→TD upgrade, pricing/billing UX.  
14. Mobile viewer + dashboard review.  
15. Go-live regression matrix rehearsal.  
16. Load test (A17) — large event, hundreds of brackets, combo formats + side actions.

---

## E — PR Test plan snippet (paste into GitHub)

```markdown
## Test plan
- [ ] Generate + View + Print Baker team bracket (16-team SE)
- [ ] Score Round of 16 on diagram; winners seat into QF with score inputs
- [ ] Overlay path: Game 1 team-sheet scores still complete R16 after sync/score save
- [ ] Resolve tied R16 via Tied — pick winner
- [ ] Standings: team HCP + Advance cut for top-N feeder
- [ ] Reports menu: roster / standings / score sheets / lane sheets / financials preview
- [ ] Lane Pair Conflicts (event + tournament); tournament-level EVENT_INFO assistant does not 403
- [ ] Stepladder diagram only when that format exists (Reports + Format Editor Print stepladder)
- [ ] SA Conflicts modal Print (honors show-all-pairs)
- [ ] Excel — Standings and Excel — Scores from Reports; Standings tab Export Excel
- [ ] Event + Tournament Share: Print standings poster (one-pager QR to live/standings)
- [ ] SA-only create: one event / one round / one squad; hidden format/standings/lanes/public; upgrade is POST not GET
- [ ] Bowler Stats Scores + Financials Export Excel matches the on-screen grids
- [ ] TEAM sidepots: Bowler vs Team toggle on HG / HS / Eliminator / Brackets; exclusive team vs bowler signup cells on a mixed event
- [ ] TEAM brackets: team-line entries; payout sheet Team line + Alphabetical (teams then bowlers) vs Group by team
- [ ] Love Doubles: cartesian male×female standings; reports; mixed-gender signup
- [ ] Alibi Doubles: chosen partner, one fee per pair, freeze after scoring starts, 4-up slips, reports + live
- [ ] Stats Financials: live pot SA won matches payout sheet (HG / HS / Eliminator / MD / Love Doubles / Alibi Doubles); Excel matches grid
- [ ] Center / Organization form on `/pricing` (required + optional volume fields; success state)
- [ ] Load test: large event (hundreds of bowlers), hundreds of brackets, combo formats + many SA types on one event
- [ ] Guardrails: FE check:datetime, god-components, vibe-ship; BE vibe-ship; focused unit tests green
```
