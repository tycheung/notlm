import type { MatchSeriesRead } from '../../../api/round-match-series';
import type { DiagramAdapterContext, DiagramColumn, DiagramMatch, DiagramSection, TournamentDiagramModel } from './types';
import { buildParticipantOptions } from '../../event-scoring/visual/adapters/helpers';
import {
  buildDiagramParticipant,
  roundHeader,
} from './helpers';

const SEGMENT_ORDER = ['winner', 'loser', 'grand_final', 'bracket_reset'] as const;

const SEGMENT_LABELS: Record<string, string> = {
  winner: 'Winners bracket',
  loser: 'Losers bracket',
  grand_final: 'Grand final',
  bracket_reset: 'Bracket reset',
};

function segmentOf(series: MatchSeriesRead): string {
  const seg = String(series.bracket_segment || 'winner');
  if (seg === 'loser' || seg === 'grand_final' || seg === 'bracket_reset') return seg;
  return 'winner';
}

function buildColumnsForSegment(
  seriesList: MatchSeriesRead[],
  segmentKey: string,
  ctx: DiagramAdapterContext
): DiagramColumn[] {
  const { allGames, isTeamEvent, roundParticipants } = ctx;
  const options = buildParticipantOptions(roundParticipants);
  const inSegment = seriesList.filter((s) => segmentOf(s) === segmentKey);

  const roundNumbers = [
    ...new Set(
      inSegment
        .map((s) => Number((s as any).bracket_round))
        .filter((n) => Number.isFinite(n))
    ),
  ].sort((a, b) => a - b);

  return roundNumbers.map((roundNum) => {
    const inRound = inSegment
      .filter((s) => Number((s as any).bracket_round) === roundNum)
      .sort((a, b) => Number((a as any).bracket_slot ?? 0) - Number((b as any).bracket_slot ?? 0));

    const matches: DiagramMatch[] = inRound.map((s, slotIndex) => {
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
        slotIndex,
        feederAIndex: slotIndex * 2,
        feederBIndex: slotIndex * 2 + 1,
        bracketSegment: segmentKey,
        participants: [
          buildDiagramParticipant(sideA, 0, options, allGames, s, isTeamEvent, winnerSide),
          buildDiagramParticipant(sideB, 1, options, allGames, s, isTeamEvent, winnerSide),
        ],
      };
    });

    return {
      key: `${segmentKey}-round-${roundNum}`,
      header: roundHeader(roundNumbers.indexOf(roundNum), roundNumbers.length),
      matches,
    };
  });
}

export function buildDoubleElimDiagram(ctx: DiagramAdapterContext): TournamentDiagramModel {
  const { matchSeries } = ctx;
  const presentSegments = SEGMENT_ORDER.filter((seg) =>
    matchSeries.some((s) => segmentOf(s) === seg)
  );

  const sections: DiagramSection[] = presentSegments.map((seg) => ({
    key: seg,
    label: SEGMENT_LABELS[seg] ?? seg,
    columns: buildColumnsForSegment(matchSeries, seg, ctx),
  }));

  const firstSection = sections[0];

  return {
    layout: 'bracket',
    title: 'Double elimination',
    columns: firstSection?.columns ?? [],
    sections: sections.length > 1 ? sections : undefined,
  };
}
