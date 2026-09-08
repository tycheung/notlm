# DB recreate checklist — format/RR/H2H ship

**Branch:** `feat/format-scoring-rr-league` (merged to `main`)  
**Policy:** pre-v1 — no Alembic; drop and recreate DB after CodePipeline deploy (SQLModel `create_all`).

## Required after deploy

1. Drop the application database (or use your pipeline’s destroy/recreate path).
2. Redeploy / restart so schema is created via `create_all`.
3. Re-seed fixtures / TD accounts as needed.

## Schema / enum deltas vs prior `main`

| Change | Kind | Detail |
|--------|------|--------|
| `games.is_baker` | **New column** | `bool`, default `false`, indexed. Marks Baker shared team scores (not for individual averages). |
| `AdvancementType.TOTAL_PINFALL_WITH_BONUS` | New string enum value | `"total_pinfall_with_bonus"` on relationships / ranking. |
| `AdvancementType.ELIMINATION_ORDER` | New string enum value | `"elimination_order"` for H2H finals placement. |

## JSON-only config (no migration)

Stored on `rounds.competition_method_config` and/or `round_formats.options`:

- `series_decision_mode` (`race_to_wins` | `games_total`)
- `game_style` (`standard` | `baker`)
- RR league: `schedule_mode`, `scheduled_games`, `position_round_game`, `position_round_lane_placement`, `bonus_pins`, `games_per_match`
- `dylg_*` may still appear historically; per-round DYLG UI is hidden until scoring honors it

## Smoke after recreate

- Create/apply a Baker RR league template → score → Standings tab
- Stepladder finals: classic low-seed open, live climb, elimination-order championship labels
- Tied H2H: pick winner on Game Scoring when scores tie
