import type { MatchSeriesRead } from '../../../api/round-match-series';
import type { DiagramAdapterContext, DiagramColumn, DiagramMatch, TournamentDiagramModel } from './types';
import { buildParticipantOptions } from '../../event-scoring/visual/adapters/helpers';
import {
  buildDiagramParticipant,
  roundHeader,
  winsBadge,
} from './helpers';

function segmentFilter(series: MatchSeriesRead): boolean {
  const seg = String(series.bracket_segment || '');
  return seg !== 'loser' && seg !== 'grand_final' && seg !== 'bracket_reset';
}

export function buildSingleElimDiagram(ctx: DiagramAdapterContext): TournamentDiagramModel {
  const { matchSeries, roundParticipants, allGames, isTeamEvent } = ctx;
  const options = buildParticipantOptions(roundParticipants);
  const filtered = matchSeries.filter(segmentFilter);

  const roundNumbers = [
    ...new Set(
      filtered
        .map((s) => Number((s as any).bracket_round))
        .filter((n) => Number.isFinite(n))
    ),
  ].sort((a, b) => a - b);

  const columns: DiagramColumn[] = roundNumbers.map((roundNum) => {
    const inRound = filtered
      .filter((s) => Number((s as any).bracket_round) === roundNum)
      .sort((a, b) => Number((a as any).bracket_slot ?? 0) - Number((b as any).bracket_slot ?? 0));

    const matches: DiagramMatch[] = inRound.map((s, slotIndex) => {
      const sideA = (s.participants || []).find((p) => p.side === 0);
      const sideB = (s.participants || []).find((p) => p.side === 1);
      const winnerSide = (s.winner_side as 0 | 1 | null) ?? null;
      const raceTo = Math.max(1, Number(s.race_to_wins || 1));

      return {
        id: `series-${s.id}`,
        seriesId: s.id,
        label: s.match_label,
        status: s.status,
        winsSide0: s.wins_side_0 ?? 0,
        winsSide1: s.wins_side_1 ?? 0,
        winnerSide,
        maxGames: Math.max(1, Number(s.max_games || 1)),
        raceToWins: raceTo,
        slotIndex,
        feederAIndex: slotIndex * 2,
        feederBIndex: slotIndex * 2 + 1,
        participants: [
          buildDiagramParticipant(sideA, 0, options, allGames, s, isTeamEvent, winnerSide),
          buildDiagramParticipant(sideB, 1, options, allGames, s, isTeamEvent, winnerSide),
        ],
      };
    });

    return {
      key: `round-${roundNum}`,
      header: roundHeader(roundNumbers.indexOf(roundNum), roundNumbers.length),
      matches,
    };
  });

  if (columns.length === 0 && filtered.length > 0) {
    const sorted = [...filtered].sort((a, b) => a.display_order - b.display_order);
    columns.push({
      key: 'round-0',
      header: 'Matches',
      matches: sorted.map((s, idx) => {
        const sideA = (s.participants || []).find((p) => p.side === 0);
        const sideB = (s.participants || []).find((p) => p.side === 1);
        const winnerSide = (s.winner_side as 0 | 1 | null) ?? null;
        return {
          id: `series-${s.id}`,
          seriesId: s.id,
          label: s.match_label,
          status: s.status,
          winsSide0: s.wins_side_0 ?? 0,
          winsSide1: s.wins_side_1 ?? 0,
          winnerSide,
          maxGames: Math.max(1, Number(s.max_games || 1)),
          raceToWins: Math.max(1, Number(s.race_to_wins || 1)),
          slotIndex: idx,
          feederAIndex: null,
          feederBIndex: null,
          participants: [
            buildDiagramParticipant(sideA, 0, options, allGames, s, isTeamEvent, winnerSide),
            buildDiagramParticipant(sideB, 1, options, allGames, s, isTeamEvent, winnerSide),
          ],
        };
      }),
    });
  }

  return {
    layout: 'bracket',
    title: 'Bracket',
    columns,
    rosterChips: options.map((p, i) => ({ seat: i + 1, label: p.label })),
  };
}

export function matchBlockPropsFromDiagramMatch(
  match: DiagramMatch,
  opts?: {
    onScoreChange?: (side: 0 | 1, gameIndex: number, value: number | null) => void;
    scoreAriaLabel?: (side: 0 | 1, gameIndex: number, name: string) => string;
  }
) {
  const winsLabel = winsBadge(match.winsSide0, match.winsSide1, match.raceToWins);
  return {
    label: match.label,
    status: match.status,
    winsLabel,
    participants: [
      {
        side: 0 as const,
        name: match.participants[0].name,
        isTbd: match.participants[0].isTbd,
        isWinner: match.participants[0].isWinner,
        scores: match.participants[0].scores,
        carryOverValue: match.participants[0].carryOverValue,
        advancementDestinations: match.participants[0].advancementDestinations,
        onScoreChange: opts?.onScoreChange
          ? (gameIndex: number, value: number | null) => opts.onScoreChange!(0, gameIndex, value)
          : undefined,
        scoreAriaLabel: opts?.scoreAriaLabel
          ? (gameIndex: number) => opts.scoreAriaLabel!(0, gameIndex, match.participants[0].name)
          : undefined,
      },
      {
        side: 1 as const,
        name: match.participants[1].name,
        isTbd: match.participants[1].isTbd,
        isWinner: match.participants[1].isWinner,
        scores: match.participants[1].scores,
        carryOverValue: match.participants[1].carryOverValue,
        advancementDestinations: match.participants[1].advancementDestinations,
        onScoreChange: opts?.onScoreChange
          ? (gameIndex: number, value: number | null) => opts.onScoreChange!(1, gameIndex, value)
          : undefined,
        scoreAriaLabel: opts?.scoreAriaLabel
          ? (gameIndex: number) => opts.scoreAriaLabel!(1, gameIndex, match.participants[1].name)
          : undefined,
      },
    ],
  };
}
