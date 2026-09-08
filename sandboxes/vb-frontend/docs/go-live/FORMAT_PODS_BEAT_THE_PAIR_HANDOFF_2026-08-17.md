# Format handoff — Pods / Beat the pair (2026-08-17)

**Repos:** `fastapi-backend`, `react-frontend`  
**Method key:** `pods` · **UI label:** Pods (Beat the pair)  
**Related:** `GO_LIVE_MASTER_TODO_2026-07-30.md`, bracket Format Editor pattern

---

## Product rules (locked)

| Rule | Decision |
|------|----------|
| Ranking inside each pod | **Total pinfall** (not match W–L) |
| Scratch vs handicap | Event/round scoring basis + relationship `advancement_score_basis` |
| Teams | **Baker pods** supported via `game_style: baker` on team events |
| Remainder mix | TD toggle: **`even` (default)** vs `prefer_max` |
| Balance | `by_seed` (standings / pins / qualifying total) \| `random` \| `manual` |
| Advance cuts | Per pod size via `advance_by_size` map (e.g. size 6 → 3, size 4 → 2) |

**Deferred (after this format desk):** Rollover button for brackets.

---

## Config keys (`PodsConfig`)

| Key | Notes |
|-----|--------|
| `pod_size_min` / `pod_size_max` | Allowed sizes; legacy `pod_size` treated as max |
| `advance_by_size` | `{ "4": 2, "5": 2, "6": 3 }` string keys |
| `balance_mode` | `by_seed` \| `random` \| `manual` (`by_average` legacy → `by_seed`) |
| `remainder_mode` | `even` (default) \| `prefer_max` |
| `pod_membership` | Optional list of seed lists (1-based) after generate / for manual |
| `game_count` | Games per series / pinfall accumulation |
| `game_style` | `standard` \| `baker` |
| `games_before_elimination` | Legacy; no longer truncates global pair list |
| `seed_source_mode` | `feeder` (default) \| `round` \| `all_rounds`. Who is seed 1…N among advancers. `feeder` = incoming feeder finish; `round` = one chosen ancestor round (`seed_source_round_id`); `all_rounds` = sum every scored game in the event. Same keys on bracket / RR / stepladder. |
| `seed_source_round_id` | Required when `seed_source_mode` is `round`. Legacy configs with only this id (no mode) are treated as `round`. |

Shell metadata: `bracket_slot` = 0-based pod index; `match_label` like `Pod 2 · Match 1`.

---

## Engine flow

1. Size mix from N + min/max + remainder_mode  
2. Assign seeds into pods (snake for seed/avg; shuffle for random; membership for manual)  
3. All-vs-all shells within each pod  
4. Standings / advancement: rank **within pod** by scratch or handicap pinfall; take `advance_by_size[size]` from each  

---

## Format Editor

Dedicated **PodsMatchupsPanel** (same split as RR / Bracket Matchups vs Edit settings):

- Min / max, advance-by-size table, remainder toggle, balance mode  
- **Seed order from:** incoming feeder (default), a specific earlier round, or all rounds (event total)  
- Save → Generate / sync → membership + matches grouped by pod  
- Manual: edit membership before generate  

Chained example: Qualifying → pods of 60 → pods of 24. On the second pods round set **Seed order from** = Qualifying so the 24 are snake-seeded by original totals, not first-pods pinfall. Does not change who advanced.

**Final payout (`advancement_score_scope` on payout arrow):** Ranking totals from **Source round only** (default) or **All rounds (event total)**. Pods → payout still uses within-pod cuts for who cashes; scope only re-orders those finalists for standings/prize (e.g. qual 3 + pod1 1 + pod2 1 = 5-game totals).

---

## QA matrix

- [ ] Singles scratch pods: even remainder, advance-by-size cuts correct  
- [ ] Singles handicap: HCP totals drive within-pod rank  
- [ ] Baker team pods: one team score per game; cuts by Baker pinfall  
- [ ] Balance modes: by_seed / random / manual  
- [ ] Format Editor generate + Game Scoring diagram/grid by pod  
- [ ] Second pods round: seed from original qualifying, not first-pods pinfall  
