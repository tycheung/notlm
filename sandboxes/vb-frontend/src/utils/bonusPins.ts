import type { MatchSeriesRead } from '../api/round-match-series';

export type BonusPinsConfig = { win: number; tie: number; loss: number };

/** Parse competition_method_config.bonus_pins into win/tie/loss ints. */
export function parseBonusPinsConfig(
  cfg: Record<string, unknown> | null | undefined
): BonusPinsConfig {
  const raw = cfg?.bonus_pins;
  if (!raw || typeof raw !== 'object') {
    return { win: 0, tie: 0, loss: 0 };
  }
  const b = raw as Record<string, unknown>;
  return {
    win: Number(b.win) || 0,
    tie: Number(b.tie) || 0,
    loss: Number(b.loss) || 0,
  };
}

export function bonusPinsConfigured(
  cfg: Record<string, unknown> | null | undefined
): boolean {
  const b = parseBonusPinsConfig(cfg);
  return b.win !== 0 || b.tie !== 0 || b.loss !== 0;
}

/** Pins awarded to one side of a completed head-to-head series (mirrors backend). */
export function awardBonusForSide(
  bonus: BonusPinsConfig,
  side: 0 | 1,
  winsSide0: number,
  winsSide1: number,
  winnerSide: number | null
): number {
  const own = side === 0 ? winsSide0 : winsSide1;
  const opp = side === 0 ? winsSide1 : winsSide0;
  if (winnerSide === null && own === opp) return bonus.tie;
  if (winnerSide === side || (winnerSide === null && own > opp)) return bonus.win;
  return bonus.loss;
}

/**
 * Aggregate match-play bonus pins per team from completed series.
 * Optional ep→team map fills missing team_id on series participants.
 */
export function computeMatchPlayBonusByTeamId(
  seriesList: MatchSeriesRead[],
  bonus: BonusPinsConfig,
  eventParticipantToTeamId?: Map<number, number>
): Map<number, number> {
  const out = new Map<number, number>();
  if (!bonus.win && !bonus.tie && !bonus.loss) return out;

  for (const s of seriesList) {
    if (String(s.status || '').toLowerCase() !== 'complete') continue;
    const bySide = new Map(s.participants.map((p) => [p.side, p]));
    if (!bySide.has(0) || !bySide.has(1)) continue;

    for (const side of [0, 1] as const) {
      const part = bySide.get(side);
      if (!part) continue;
      let teamId = part.team_id != null ? Number(part.team_id) : null;
      if (teamId == null && part.event_participant_id != null && eventParticipantToTeamId) {
        teamId = eventParticipantToTeamId.get(Number(part.event_participant_id)) ?? null;
      }
      if (teamId == null) continue;

      const awarded = awardBonusForSide(
        bonus,
        side,
        Number(s.wins_side_0) || 0,
        Number(s.wins_side_1) || 0,
        s.winner_side == null ? null : Number(s.winner_side)
      );
      out.set(teamId, (out.get(teamId) || 0) + awarded);
    }
  }
  return out;
}
