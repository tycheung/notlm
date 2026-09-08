import type { MatchSeriesRead } from '../../../api/round-match-series';
import type { RoundRead } from '../../../types/round';
import type { RoundRobinScheduleConfig } from './RoundRobinScheduleSettings';
import { normalizeSeedSourceRoundId, seedSourceFromConfig, seedSourceToPatch } from './seedSourceRound';

export type GameSection = {
  gameNumber: number;
  isPosition: boolean;
  series: MatchSeriesRead[];
};

export function groupSeriesByGame(series: MatchSeriesRead[]): GameSection[] {
  const byGame = new Map<number, MatchSeriesRead[]>();
  let hasMeta = false;
  for (const s of series) {
    if (s.bracket_round != null) {
      hasMeta = true;
      const g = Number(s.bracket_round);
      const list = byGame.get(g) ?? [];
      list.push(s);
      byGame.set(g, list);
    }
  }
  if (hasMeta && byGame.size > 0) {
    return [...byGame.keys()]
      .sort((a, b) => a - b)
      .map((g0) => {
        const rows = (byGame.get(g0) || []).sort(
          (a, b) =>
            (a.bracket_slot ?? a.display_order) - (b.bracket_slot ?? b.display_order)
        );
        return {
          gameNumber: g0 + 1,
          isPosition: rows.some((r) => r.bracket_segment === 'position'),
          series: rows,
        };
      });
  }
  if (series.length === 0) return [];
  const sorted = [...series].sort((a, b) => a.display_order - b.display_order);
  return [
    {
      gameNumber: 1,
      isPosition: sorted.some((r) => r.bracket_segment === 'position'),
      series: sorted,
    },
  ];
}

export function scheduleConfigFromRound(round: RoundRead): RoundRobinScheduleConfig {
  const cfg = (round.competition_method_config || {}) as Record<string, unknown>;
  const games =
    cfg.scheduled_games != null
      ? Number(cfg.scheduled_games)
      : cfg.total_matches_or_games != null
        ? Number(cfg.total_matches_or_games)
        : 8;
  return {
    schedule_mode: String(cfg.schedule_mode ?? 'league'),
    scheduled_games: games,
    total_matches_or_games: games,
    position_round_game:
      cfg.position_round_game == null || cfg.position_round_game === ''
        ? null
        : Number(cfg.position_round_game),
    position_round_lane_placement: String(
      cfg.position_round_lane_placement ?? 'start_low'
    ),
    ...seedSourceFromConfig(cfg),
  };
}

export function scheduleConfigToPatch(
  draft: RoundRobinScheduleConfig,
  prevCfg: Record<string, unknown>
): Record<string, unknown> {
  const games = draft.scheduled_games ?? draft.total_matches_or_games ?? 8;
  return {
    ...prevCfg,
    schedule_mode: draft.schedule_mode ?? 'league',
    scheduled_games: games,
    total_matches_or_games: games,
    position_round_game: draft.position_round_game ?? null,
    position_round_lane_placement: draft.position_round_lane_placement ?? 'start_low',
    ...seedSourceToPatch(draft, prevCfg),
  };
}
