export interface NormalizeGameNumbersOptions {
  eventGameCount?: number;
  requiredCount?: number;
}

export type GameOrder = 'forward' | 'reverse';

/** Mirror backend side_actions.game_plan.normalize_game_numbers. */
export function normalizeGameNumbers(
  values: unknown[],
  options: NormalizeGameNumbersOptions = {}
): number[] {
  const numbers = values.map((value) => {
    const number = Number(value);
    if (typeof value === 'boolean' || !Number.isInteger(number) || number < 1) {
      throw new Error('Game numbers must be positive integers');
    }
    if (options.eventGameCount !== undefined && number > options.eventGameCount) {
      throw new Error(
        `Game ${number} exceeds the event game count of ${options.eventGameCount}`
      );
    }
    return number;
  });

  if (!numbers.length) {
    throw new Error('Select at least one game');
  }
  if (new Set(numbers).size !== numbers.length) {
    throw new Error('Game numbers cannot contain duplicates');
  }

  const normalized = [...numbers].sort((left, right) => left - right);
  if (
    options.requiredCount !== undefined &&
    normalized.length !== options.requiredCount
  ) {
    throw new Error(`Select exactly ${options.requiredCount} games`);
  }
  return normalized;
}

export function normalizeGameOrder(value: unknown): GameOrder {
  if (value == null || value === '') return 'forward';
  const text = String(value).trim().toLowerCase();
  if (text === 'forward' || text === 'reverse') return text;
  throw new Error("game_order must be 'forward' or 'reverse'");
}

/** Selected games in bracket stage order (G1 → G2 → Final). */
export function orderedStageGames(
  values: unknown[],
  options: NormalizeGameNumbersOptions & { gameOrder?: unknown } = {}
): number[] {
  // Allow empty while the TD is re-selecting; callers validate before save.
  if (!Array.isArray(values) || values.length === 0) {
    return [];
  }
  const normalized = normalizeGameNumbers(values, options);
  const order = normalizeGameOrder(options.gameOrder);
  return order === 'reverse' ? [...normalized].reverse() : normalized;
}

export function stageIndexForGame(
  gameNumbers: unknown[],
  gameNumber: number,
  options?: { gameOrder?: unknown }
): number | null {
  if (!Array.isArray(gameNumbers) || gameNumbers.length === 0) {
    return null;
  }
  const ordered =
    options?.gameOrder !== undefined
      ? orderedStageGames(gameNumbers, { gameOrder: options.gameOrder })
      : gameNumbers.map((value) => Number(value));
  const index = ordered.indexOf(gameNumber);
  return index >= 0 ? index : null;
}

export function validateBestN(gameNumbers: unknown[], bestN: unknown): number {
  if (!Array.isArray(gameNumbers) || gameNumbers.length === 0) {
    throw new Error('Select at least one game');
  }
  const normalized = normalizeGameNumbers(gameNumbers);
  const count = Number(bestN);
  if (typeof bestN === 'boolean' || !Number.isInteger(count) || count < 1) {
    throw new Error('best_n must be a positive integer');
  }
  if (count > normalized.length) {
    throw new Error('best_n cannot exceed the number of selected games');
  }
  return count;
}
