/**
 * Product interaction planes — Ask/Guide/Do (internal only).
 *
 * Planes are silent: intent detection elevates for the turn. Never preach
 * “switch to Guide/Do” to the user — see elevatePlane / planeRequiredByHeads.
 *
 * Legacy (features.routingTree off): chrome/session was a hard gate (ADR-010).
 * Tree on (ADR-011): NLU plane + silent elevate; chrome is soft bias only.
 */

export type InteractionMode = 'ask' | 'guide' | 'do';

export function isInteractionMode(value: unknown): value is InteractionMode {
  return value === 'ask' || value === 'guide' || value === 'do';
}

export function planeRank(mode: InteractionMode): number {
  if (mode === 'do') return 2;
  if (mode === 'guide') return 1;
  return 0;
}

/** Higher-capability plane wins (ask < guide < do). */
export function elevatePlane(
  current: InteractionMode,
  required: InteractionMode
): InteractionMode {
  return planeRank(required) > planeRank(current) ? required : current;
}

/**
 * Minimum plane for attached action heads. Mutations need do; nav/tour/search
 * need at least guide. Null when answer-only.
 */
export function planeRequiredByHeads(heads: {
  stepId?: string | null;
  mutationId?: string | null;
  tourId?: string | null;
  searchId?: string | null;
  openSurface?: string | null;
}): InteractionMode | null {
  if (heads.mutationId) return 'do';
  if (
    heads.stepId ||
    heads.tourId ||
    heads.searchId ||
    heads.openSurface
  ) {
    return 'guide';
  }
  return null;
}

export function resolveInteractionMode(
  session: { flags?: Record<string, unknown> } | null | undefined,
  features?: { defaultInteractionMode?: InteractionMode } | null
): InteractionMode {
  const fromSession = session?.flags?.interactionMode;
  if (isInteractionMode(fromSession)) return fromSession;
  const fromFeatures = features?.defaultInteractionMode;
  if (isInteractionMode(fromFeatures)) return fromFeatures;
  // Backward-compatible default for demos / hosts that never set a mode.
  return 'do';
}

/** Ask: answers + instruct only — never auto-navigate or mutate. */
export function modeBlocksAutoNavigate(mode: InteractionMode): boolean {
  return mode === 'ask';
}

/** Ask + Guide: no mutate / draft-apply / delete confirms from chat. */
export function modeBlocksMutations(mode: InteractionMode): boolean {
  return mode !== 'do';
}

/**
 * @deprecated Modes are silent — always null. Kept so call sites compile.
 */
export function askModeInstructCopy(_mode: InteractionMode): string | null {
  return null;
}
