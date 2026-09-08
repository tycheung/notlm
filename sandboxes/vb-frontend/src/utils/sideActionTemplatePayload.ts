import type { SideActionType } from '../types/side_action';
import type { SideActionTemplatePayload } from '../types/sideActionTemplate';

export type SideActionTemplateFormSnapshot = {
  name?: string;
  description?: string;
  entryFee: number;
  maxParticipants: number;
  houseCutPercentage: number;
  houseCutAmount: number | null;
  houseCutType: 'percentage' | 'dollars_per_entry' | 'amount';
  prizeDistribution: Record<string, number>;
  prizeType: 'percentage' | 'amount' | 'dollars_per_entry';
  gameNumbers: number[];
  typeConfig: Record<string, unknown>;
};

function sanitizeGameNumbers(
  values: unknown[] | undefined,
  eventGameCount: number
): number[] {
  const maxGame = Math.max(1, eventGameCount || 1);
  const seen = new Set<number>();
  const out: number[] = [];
  for (const value of values || []) {
    const number = Number(value);
    if (!Number.isInteger(number) || number < 1 || number > maxGame) continue;
    if (seen.has(number)) continue;
    seen.add(number);
    out.push(number);
  }
  return out.sort((a, b) => a - b);
}

/** Build a portable payload from the current form state. */
export function buildSideActionTemplatePayload(
  snapshot: SideActionTemplateFormSnapshot
): SideActionTemplatePayload {
  const games = sanitizeGameNumbers(snapshot.gameNumbers, 999);
  return {
    version: 1,
    suggested_name: snapshot.name?.trim() || undefined,
    description: snapshot.description?.trim() || undefined,
    entry_fee: Number(snapshot.entryFee) || 0,
    max_participants: Number(snapshot.maxParticipants) || 0,
    house_cut_percentage: Number(snapshot.houseCutPercentage) || 0,
    house_cut_amount: snapshot.houseCutAmount,
    house_cut_type: snapshot.houseCutType,
    prize_distribution: { ...snapshot.prizeDistribution },
    prize_type: snapshot.prizeType,
    game_numbers: games,
    type_config: { ...(snapshot.typeConfig || {}) },
  };
}

/**
 * Map a saved template onto form fields.
 * Clamps game numbers to the current event's game count.
 */
export function applySideActionTemplatePayload(
  payload: SideActionTemplatePayload,
  options: {
    sideActionType: SideActionType;
    eventGameCount: number;
    /** When true, also apply suggested_name into the name field. */
    applySuggestedName?: boolean;
  }
): Partial<SideActionTemplateFormSnapshot> {
  const maxGame = Math.max(1, options.eventGameCount || 1);
  let games = sanitizeGameNumbers(payload.game_numbers, maxGame);

  if (options.sideActionType === 'bracket') {
    if (games.length !== 3) {
      games =
        games.length >= 3
          ? games.slice(0, 3)
          : Array.from({ length: Math.min(3, maxGame) }, (_, i) => i + 1);
    }
  } else if (options.sideActionType === 'mystery_doubles') {
    games = games.length ? [games[0]] : [1];
  } else if (!games.length) {
    games = [1];
  }

  const next: Partial<SideActionTemplateFormSnapshot> = {
    description: payload.description != null ? String(payload.description) : undefined,
    entryFee: Number(payload.entry_fee ?? 0),
    maxParticipants: Number(payload.max_participants ?? 0),
    houseCutPercentage: Number(payload.house_cut_percentage ?? 0),
    houseCutAmount:
      payload.house_cut_amount === undefined ? null : payload.house_cut_amount,
    houseCutType:
      payload.house_cut_type === 'percentage' ||
      payload.house_cut_type === 'dollars_per_entry' ||
      payload.house_cut_type === 'amount'
        ? payload.house_cut_type
        : 'amount',
    prizeDistribution: { ...(payload.prize_distribution || {}) },
    prizeType:
      payload.prize_type === 'percentage' ||
      payload.prize_type === 'dollars_per_entry' ||
      payload.prize_type === 'amount'
        ? payload.prize_type
        : 'amount',
    gameNumbers: games,
    typeConfig: {
      ...(payload.type_config || {}),
      game_numbers: games,
    },
  };

  if (options.applySuggestedName && payload.suggested_name?.trim()) {
    next.name = payload.suggested_name.trim();
  }

  return next;
}
