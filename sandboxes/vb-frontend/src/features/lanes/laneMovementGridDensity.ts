/**
 * Print density for the lane-movement schedule grid.
 * Small events keep comfortable sizing; larger grids scale down toward a
 * 36-lane × 36-game single landscape letter page.
 */

export type LaneMovementGridDensity = {
  /** CSS custom properties applied on the grid wrapper */
  cssVars: Record<string, string>;
  pageMargin: string;
  /** Compact header/footer chrome when dense */
  compactChrome: boolean;
};

const COMFORT_LANES = 20;
const COMFORT_GAMES = 18;
const TARGET_LANES = 36;
const TARGET_GAMES = 36;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/**
 * t=0 → current comfortable look; t=1 → dense enough for ~36×36.
 */
export function laneMovementGridDensityProgress(
  laneCount: number,
  gameCount: number
): number {
  const col = laneCount <= COMFORT_LANES ? 0 : (laneCount - COMFORT_LANES) / (TARGET_LANES - COMFORT_LANES);
  const row = gameCount <= COMFORT_GAMES ? 0 : (gameCount - COMFORT_GAMES) / (TARGET_GAMES - COMFORT_GAMES);
  return clamp01(Math.max(col, row));
}

export function resolveLaneMovementGridDensity(
  laneCount: number,
  gameCount: number
): LaneMovementGridDensity {
  const t = laneMovementGridDensityProgress(laneCount, gameCount);

  // Comfort → dense presets (pt / px / rem-ish widths).
  const fontPt = lerp(9, 6.25, t);
  const padY = lerp(4, 1, t);
  const padX = lerp(6, 1.5, t);
  const gameColRem = lerp(3.2, 1.55, t);
  const titlePt = lerp(16, 12, t);
  const subtitlePt = lerp(11, 8, t);
  const labelPt = lerp(10, 7.5, t);
  const headerPadBottom = lerp(8, 4, t);
  const headerMarginBottom = lerp(14, 6, t);
  const footerMarginTop = lerp(28, 8, t);
  const footerPadTop = lerp(10, 4, t);
  const footerLogoPx = lerp(28, 18, t);
  const pageMarginIn = lerp(0.4, 0.28, t);

  return {
    compactChrome: t > 0.35,
    pageMargin: `${pageMarginIn.toFixed(2)}in`,
    cssVars: {
      '--lm-font': `${fontPt.toFixed(2)}pt`,
      '--lm-pad-y': `${padY.toFixed(2)}px`,
      '--lm-pad-x': `${padX.toFixed(2)}px`,
      '--lm-game-w': `${gameColRem.toFixed(2)}rem`,
      '--lm-title': `${titlePt.toFixed(2)}pt`,
      '--lm-subtitle': `${subtitlePt.toFixed(2)}pt`,
      '--lm-label': `${labelPt.toFixed(2)}pt`,
      '--lm-header-pad-b': `${headerPadBottom.toFixed(2)}px`,
      '--lm-header-margin-b': `${headerMarginBottom.toFixed(2)}px`,
      '--lm-footer-margin-t': `${footerMarginTop.toFixed(2)}px`,
      '--lm-footer-pad-t': `${footerPadTop.toFixed(2)}px`,
      '--lm-footer-logo': `${footerLogoPx.toFixed(2)}px`,
    },
  };
}

export function densityCssVarsStyle(vars: Record<string, string>): string {
  return Object.entries(vars)
    .map(([key, value]) => `${key}: ${value}`)
    .join('; ');
}
