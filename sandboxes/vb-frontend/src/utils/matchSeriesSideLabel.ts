import type { MatchSeriesRead } from '../api/round-match-series';

/** Side label for match-series list/grid UIs (RR matchups, H2H homes). */
export function matchSeriesSideLabel(
  series: MatchSeriesRead,
  side: 0 | 1,
  opts?: {
    isTeamEvent?: boolean;
    isPosition?: boolean;
    teamNames?: Map<number, string>;
    participantNames?: Map<number, string>;
  }
): string {
  const part = series.participants.find((p) => p.side === side);
  if (!part) return 'TBD';

  const isTeam = Boolean(opts?.isTeamEvent);
  if (isTeam && part.team_id != null) {
    return opts?.teamNames?.get(Number(part.team_id)) || `Team ${part.team_id}`;
  }
  if (!isTeam && part.event_participant_id != null) {
    return (
      opts?.participantNames?.get(Number(part.event_participant_id)) ||
      `Bowler ${part.event_participant_id}`
    );
  }
  if (part.team_id != null) return `Team ${part.team_id}`;
  if (part.event_participant_id != null) return `Bowler ${part.event_participant_id}`;

  const seed = part.seed_order != null && part.seed_order > 0 ? part.seed_order : null;
  if (seed != null) {
    return opts?.isPosition ? `Place ${seed}` : `Seed ${seed}`;
  }
  return 'TBD';
}
