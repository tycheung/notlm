export type BowlerEventGameScore = {
  game_number: number;
  score: number | null;
  is_baker?: boolean;
};

export type BowlerBowledEvent = {
  event_id: number;
  event_name: string;
  tournament_id: number;
  tournament_name: string;
  organizer_user_id?: number | null;
  start_date: string;
  games: BowlerEventGameScore[];
  place?: number | null;
  pinfall?: number | null;
  handicap?: number | null;
};

export function formatPlace(value: number | null | undefined): string {
  if (value == null || Number(value) <= 0) return '—';
  return String(value);
}

export function formatPinfall(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return String(value);
}

export function formatHandicap(value: number | null | undefined): string {
  if (value == null || Number(value) === 0) return '—';
  return String(value);
}

export function gameScoreColumnNumbers(events: BowlerBowledEvent[]): number[] {
  let max = 0;
  for (const event of events) {
    for (const game of event.games) {
      if (game.game_number > max) max = game.game_number;
    }
  }
  return Array.from({ length: max }, (_, index) => index + 1);
}

export function scoresForGameNumber(event: BowlerBowledEvent, gameNumber: number): string {
  const matches = event.games.filter((game) => game.game_number === gameNumber);
  if (matches.length === 0 || matches.every((game) => game.score == null)) {
    return 'No Results';
  }
  return matches
    .filter((game) => game.score != null)
    .map((game) => String(game.score))
    .join(' / ');
}
