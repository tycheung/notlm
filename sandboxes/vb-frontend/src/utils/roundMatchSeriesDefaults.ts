export interface RoundForSeriesDefaults {
  id: number;
  format_id?: number | null;
}

export interface RoundFormatForSeriesDefaults {
  id: number;
  options?: { race_to_wins?: number; max_games?: number } | null;
}

export function resolveMatchSeriesDefaults(
  seriesRoundId: number | null,
  rounds: RoundForSeriesDefaults[],
  roundFormats: RoundFormatForSeriesDefaults[]
): { race_to_wins: number; max_games: number } {
  const selectedRound = rounds.find((round) => round.id === seriesRoundId);
  const selectedFormat = roundFormats.find(
    (format) => format.id === selectedRound?.format_id
  );
  const raceToWins = Number(selectedFormat?.options?.race_to_wins);
  const maxGames = Number(selectedFormat?.options?.max_games);
  if (!Number.isFinite(raceToWins) || !Number.isFinite(maxGames)) {
    return { race_to_wins: 2, max_games: 3 };
  }
  return { race_to_wins: raceToWins, max_games: maxGames };
}
