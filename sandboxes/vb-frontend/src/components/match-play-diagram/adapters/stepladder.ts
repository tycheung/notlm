import type { DiagramAdapterContext, DiagramColumn, DiagramMatch, TournamentDiagramModel } from './types';
import { buildParticipantOptions } from '../../event-scoring/visual/adapters/helpers';
import { buildDiagramParticipant } from './helpers';
import {
  applyStepladderScoringLocks,
  isStepladderMatchComplete,
  stepladderActiveMatchLabel,
} from './stepladderScoringLocks';

export function buildStepladderDiagram(ctx: DiagramAdapterContext): TournamentDiagramModel {
  const { matchSeries, roundParticipants, allGames, isTeamEvent } = ctx;
  const options = buildParticipantOptions(roundParticipants);
  const sorted = [...matchSeries].sort((a, b) => {
    const ar = Number((a as any).bracket_round);
    const br = Number((b as any).bracket_round);
    if (Number.isFinite(ar) && Number.isFinite(br) && ar !== br) return ar - br;
    return a.display_order - b.display_order;
  });

  const unlockedMatches: DiagramMatch[] = sorted.map((s, idx) => {
    const sideA = (s.participants || []).find((p) => p.side === 0);
    const sideB = (s.participants || []).find((p) => p.side === 1);
    const winnerSide = (s.winner_side as 0 | 1 | null) ?? null;

    return {
      id: `series-${s.id}`,
      seriesId: s.id,
      label: s.match_label ?? `Match ${idx + 1}`,
      status: s.status,
      winsSide0: s.wins_side_0 ?? 0,
      winsSide1: s.wins_side_1 ?? 0,
      winnerSide,
      maxGames: Math.max(1, Number(s.max_games || 1)),
      raceToWins: Math.max(1, Number(s.race_to_wins || 1)),
      slotIndex: idx,
      feederAIndex: idx > 0 ? idx - 1 : null,
      feederBIndex: null,
      participants: [
        buildDiagramParticipant(sideA, 0, options, allGames, s, isTeamEvent, winnerSide),
        buildDiagramParticipant(sideB, 1, options, allGames, s, isTeamEvent, winnerSide),
      ],
    };
  });

  const { matches, activeIndex } = applyStepladderScoringLocks(unlockedMatches);
  const activeLabel = stepladderActiveMatchLabel(matches, activeIndex);
  const allComplete =
    matches.length > 0 && matches.every((m) => isStepladderMatchComplete(m));

  const columns: DiagramColumn[] = matches.map((m, idx) => ({
    key: `ladder-${idx}`,
    header:
      activeIndex === idx
        ? `${m.label ?? `Match ${idx + 1}`} · Now scoring`
        : isStepladderMatchComplete(m)
          ? `${m.label ?? `Match ${idx + 1}`} · Complete`
          : activeIndex != null && idx > activeIndex
            ? `${m.label ?? `Match ${idx + 1}`} · Waiting`
            : m.label ?? `Match ${idx + 1}`,
    matches: [m],
  }));

  return {
    layout: 'stepladder',
    title: 'Stepladder',
    subtitle: activeLabel
      ? `Score the open match (${activeLabel}). Completed matches stay editable for corrections; later rungs unlock when a winner advances.`
      : allComplete
        ? 'All ladder matches are complete. Scores remain editable for corrections.'
        : 'Waiting for both sides to be seated on the next ladder match.',
    columns,
  };
}
