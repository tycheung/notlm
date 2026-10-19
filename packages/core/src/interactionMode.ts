/**
 * Product interaction modes — structural Ask/Do/Guide contract (ADR-010 UX).
 * Not pack-phrase routing: hosts set default; users override per thread via
 * session.flags.interactionMode.
 */

export type InteractionMode = 'ask' | 'guide' | 'do';

export function isInteractionMode(value: unknown): value is InteractionMode {
  return value === 'ask' || value === 'guide' || value === 'do';
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

export function askModeInstructCopy(mode: InteractionMode): string | null {
  if (mode === 'ask') {
    return 'Ask mode answers only — switch to Guide to open pages, or Do to make changes.';
  }
  if (mode === 'guide') {
    return 'Guide mode won’t change data — switch to Do to apply, create, or delete.';
  }
  return null;
}
