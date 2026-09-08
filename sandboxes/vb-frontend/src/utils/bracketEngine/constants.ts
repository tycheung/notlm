/** Seat pairs that face in Game 1 (0-indexed). */
export const G1_PAIRS: ReadonlyArray<readonly [number, number]> = [
  [0, 7],
  [3, 4],
  [1, 6],
  [2, 5],
];

/** Potential G2 pairings from G1 winners (debug / conflict tooling). */
export const G2_POTENTIAL_PAIRS: ReadonlyArray<readonly [number, number]> = [
  [0, 3],
  [0, 4],
  [7, 3],
  [7, 4],
  [1, 2],
  [1, 5],
  [6, 2],
  [6, 5],
];

/** Seats feeding G2 match 0 ("top half"). */
export const TOP_HALF = [0, 7, 3, 4] as const;

/** Seats feeding G2 match 1 ("bottom half"). */
export const BOT_HALF = [1, 6, 2, 5] as const;

/** 0 = pure random | 5 = default | 15+ = near-deterministic */
export const SEEDING_OPTIMIZER_PASSES = 5;

export const BRACKET_SIZE = 8;
export const BRACKET_ROUND_COUNT = 3;
