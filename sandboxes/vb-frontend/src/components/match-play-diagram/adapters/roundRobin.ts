import type { DiagramAdapterContext, DiagramMatch, TournamentDiagramModel } from './types';
import { buildParticipantOptions } from '../../event-scoring/visual/adapters/helpers';
import { buildDiagramParticipant } from './helpers';

function seriesToMatch(
  s: DiagramAdapterContext['matchSeries'][number],
  idx: number,
  ctx: DiagramAdapterContext
): DiagramMatch {
  const { roundParticipants, allGames, isTeamEvent } = ctx;
  const options = buildParticipantOptions(roundParticipants);
  const sideA = (s.participants || []).find((p) => p.side === 0);
  const sideB = (s.participants || []).find((p) => p.side === 1);
  const winnerSide = (s.winner_side as 0 | 1 | null) ?? null;
  const gameNum =
    s.bracket_round != null && Number.isFinite(Number(s.bracket_round))
      ? Number(s.bracket_round) + 1
      : null;
  const isPosition = s.bracket_segment === 'position';
  const placeA = sideA?.seed_order != null && sideA.seed_order > 0 ? sideA.seed_order : null;
  const placeB = sideB?.seed_order != null && sideB.seed_order > 0 ? sideB.seed_order : null;
  let label = s.match_label ?? `Match ${idx + 1}`;
  if (isPosition && placeA != null && placeB != null) {
    label = `Pos ${placeA}v${placeB}`;
  } else if (gameNum != null && !s.match_label) {
    label = `G${gameNum} · Match ${idx + 1}`;
  }

  return {
    id: `series-${s.id}`,
    seriesId: s.id,
    label,
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
}

export function buildRoundRobinDiagram(ctx: DiagramAdapterContext): TournamentDiagramModel {
  const { matchSeries } = ctx;
  const sorted = [...matchSeries].sort((a, b) => {
    const ga = a.bracket_round ?? 0;
    const gb = b.bracket_round ?? 0;
    if (ga !== gb) return ga - gb;
    const sa = a.bracket_slot ?? a.display_order;
    const sb = b.bracket_slot ?? b.display_order;
    if (sa !== sb) return sa - sb;
    return a.display_order - b.display_order;
  });

  const byGame = new Map<number, typeof sorted>();
  let hasScheduleMeta = false;
  for (const s of sorted) {
    if (s.bracket_round != null) {
      hasScheduleMeta = true;
      const g = Number(s.bracket_round);
      const list = byGame.get(g) ?? [];
      list.push(s);
      byGame.set(g, list);
    }
  }

  if (hasScheduleMeta && byGame.size > 0) {
    const gameKeys = [...byGame.keys()].sort((a, b) => a - b);
    const sections = gameKeys.map((g0) => {
      const rows = byGame.get(g0) || [];
      const isPosition = rows.some((r) => r.bracket_segment === 'position');
      const gameNum = g0 + 1;
      const matches = rows.map((s, idx) => seriesToMatch(s, idx, ctx));
      return {
        key: `game-${gameNum}`,
        label: isPosition ? `Game ${gameNum} · Position` : `Game ${gameNum}`,
        columns: [
          {
            key: `g${gameNum}`,
            header: isPosition ? 'Position matchups' : 'Matches',
            matches,
          },
        ],
      };
    });
    return {
      layout: 'grid',
      title: 'Round robin',
      columns: sections[0]?.columns ?? [],
      sections,
    };
  }

  const matches = sorted.map((s, idx) => seriesToMatch(s, idx, ctx));
  return {
    layout: 'grid',
    title: 'Round robin',
    columns: [{ key: 'grid', header: 'Matches', matches }],
  };
}
