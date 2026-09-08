/**
 * Scenario constants for full-event-simulation bundles.
 * Prize / fee defaults used when provisioning events via API helpers.
 */
export const SCENARIO_DEFAULTS = {
  entryFee: 90,
  houseCutPercentage: 18,
  additionalPrizePool: 500,
  handicapBase: 200,
  handicapPercentage: 90,
  duplicateCashingPolicy: 'allow_multiple',
} as const;
