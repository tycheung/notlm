import { ScoreType } from '../types/round_enums';
import type { RoundFormatRead } from '../types/round';

export function resolveRoundCreateGameCount(
  currentGameCount: number,
  selectedFormat: RoundFormatRead | undefined
): number {
  if (!selectedFormat || selectedFormat.score_type !== ScoreType.MATCH_PLAY) {
    return currentGameCount;
  }
  const raw = selectedFormat.options?.max_games;
  const maxGames = typeof raw === 'number' ? raw : Number(raw) || 0;
  if (!maxGames) return currentGameCount;
  return currentGameCount < maxGames ? maxGames : currentGameCount;
}
