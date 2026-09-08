import { VICTORY_PALETTE } from './victoryPalette';

/** Edge strokes, markers, and minimap node colors for tournament flow diagrams. */
export const FLOW_COLORS = {
  winners: VICTORY_PALETTE.success,
  losers: VICTORY_PALETTE.danger,
  champions: VICTORY_PALETTE.flowAmber,
  all: VICTORY_PALETTE.flowViolet,
  default: VICTORY_PALETTE.flowNeutral,
  minimapChampions: VICTORY_PALETTE.flowAmber,
  minimapCompleted: VICTORY_PALETTE.success,
  minimapInProgress: VICTORY_PALETTE.flowAmber,
  minimapScheduled: VICTORY_PALETTE.flowScheduled,
  minimapDefault: VICTORY_PALETTE.flowNeutral,
} as const;
