/**
 * Single source of truth for Victory Bowling colors (aligned with tailwind.config.js).
 * Use for MUI theme, inline SVG/chart colors, and any non-Tailwind contexts.
 */
export const VICTORY_PALETTE = {
  bg: '#0a0e17',
  surface: '#111827',
  surfaceLight: '#1e293b',
  border: '#334155',
  primary: '#f97316',
  primaryLight: '#fb923c',
  accent: '#06b6d4',
  danger: '#ef4444',
  dangerDark: '#dc2626',
  success: '#22c55e',
  text: '#f1f5f9',
  textMuted: '#94a3b8',
  textDim: '#64748b',
  pending: '#fbbf24',
  split: '#ef4444',
  strike: '#f97316',
  spare: '#06b6d4',
  /** Flow / minimap: championship & in-progress highlight */
  flowAmber: '#f59e0b',
  /** Flow: range / all-advance edges */
  flowViolet: '#8b5cf6',
  /** Flow: default / unknown */
  flowNeutral: '#6b7280',
  /** Flow minimap: scheduled nodes */
  flowScheduled: '#3b82f6',
} as const;

export type VictoryPalette = typeof VICTORY_PALETTE;
