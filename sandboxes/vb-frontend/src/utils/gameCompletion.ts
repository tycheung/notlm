/**
 * Matches backend game_is_scored_for_round_completion / round snapshot.
 * Any non-null score (including 0), verified, or terminal game status counts as scored.
 */
export function gameCountsAsScoredForRoundCompletion(game: {
  verified?: boolean;
  score: number | null | undefined;
  status?: string | null;
}): boolean {
  if (game.verified) return true;
  const st = game.status;
  if (st === 'completed' || st === 'verified') return true;
  return game.score !== null && game.score !== undefined;
}

type GameRowForCompletion = {
  squad_id?: number | null;
  team_id?: number | null;
  game_number?: number | null;
  is_team_game?: boolean | null;
  verified?: boolean;
  score?: number | null;
  status?: string | null;
};

/**
 * Mirrors backend filter_games_for_aggregate_round_completion.
 */
export function filterGamesForAggregateRoundCompletion(
  games: GameRowForCompletion[],
  options: { isTeamEvent: boolean; expectedGameCount: number }
): GameRowForCompletion[] {
  if (!options.isTeamEvent) {
    return games;
  }

  const bySquad = new Map<number, GameRowForCompletion[]>();
  for (const g of games) {
    const sid = Number(g.squad_id ?? 0);
    if (!sid) continue;
    if (!bySquad.has(sid)) bySquad.set(sid, []);
    bySquad.get(sid)!.push(g);
  }

  const authoritative: GameRowForCompletion[] = [];
  for (const squadGames of bySquad.values()) {
    const byTeam = new Map<number, GameRowForCompletion[]>();
    for (const g of squadGames) {
      const tid = g.team_id != null ? Number(g.team_id) : null;
      if (tid) {
        if (!byTeam.has(tid)) byTeam.set(tid, []);
        byTeam.get(tid)!.push(g);
      } else {
        authoritative.push(g);
      }
    }

    for (const teamGames of byTeam.values()) {
      const teamRows = teamGames.filter((g) => g.is_team_game === true);
      const memberRows = teamGames.filter((g) => g.is_team_game !== true);
      const teamScored = teamRows.filter((g) =>
        gameCountsAsScoredForRoundCompletion(g)
      ).length;
      const memberScored = memberRows.filter((g) =>
        gameCountsAsScoredForRoundCompletion(g)
      ).length;
      const fullTeamSet =
        options.expectedGameCount > 0 &&
        teamRows.length >= options.expectedGameCount;
      if (fullTeamSet || teamRows.length > 0) {
        if (teamScored > 0 || memberScored === 0) {
          authoritative.push(...teamRows);
        } else {
          authoritative.push(...memberRows);
        }
      } else if (memberRows.length > 0) {
        authoritative.push(...memberRows);
      }
    }
  }

  return authoritative;
}

export function aggregateRoundCompletionCounts(
  games: GameRowForCompletion[],
  options: { isTeamEvent: boolean; expectedGameCount: number }
): { total: number; scored: number; allScored: boolean } {
  const authoritative = filterGamesForAggregateRoundCompletion(games, options);
  const total = authoritative.length;
  const scored = authoritative.filter((g) => gameCountsAsScoredForRoundCompletion(g)).length;
  return {
    total,
    scored,
    allScored: total > 0 && scored === total,
  };
}
