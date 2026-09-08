import type { EventComplete } from '../types/event';
import type { UserEventFormatTemplateRead } from '../types/eventFormatTemplate';
import type { RoundRelationshipRead } from '../types/roundRelationship';
import { getCompetitionMethodDisplayLabel } from './competitionMethodDisplay';
import { squadsListFromRoundSpec } from './eventStructurePayloadFlow';

const STORAGE_PREFIX = 'vb-event-applied-format-template:';

export function appliedFormatTemplateStorageKey(eventId: number): string {
  return `${STORAGE_PREFIX}${eventId}`;
}

export function persistAppliedFormatTemplateId(
  eventId: number,
  templateId: number | null,
  templates: UserEventFormatTemplateRead[]
): void {
  try {
    if (templateId != null) {
      sessionStorage.setItem(appliedFormatTemplateStorageKey(eventId), String(templateId));
      return;
    }
    const defaultTemplate = templates.find((t) => t.is_default);
    if (defaultTemplate) {
      sessionStorage.setItem(
        appliedFormatTemplateStorageKey(eventId),
        String(defaultTemplate.id)
      );
    }
  } catch {
    /* sessionStorage unavailable */
  }
}

export function readPersistedAppliedFormatTemplateId(eventId: number): number | null {
  try {
    const raw = sessionStorage.getItem(appliedFormatTemplateStorageKey(eventId));
    if (!raw) return null;
    const id = parseInt(raw, 10);
    return Number.isNaN(id) ? null : id;
  } catch {
    return null;
  }
}

/** Human-readable summary from live event rounds (updates when structure changes). */
export function summarizeEventRoundStructure(
  event: EventComplete,
  relationships: RoundRelationshipRead[] = []
): string | null {
  const rounds = [...(event.rounds || [])].sort((a, b) => a.round_number - b.round_number);
  const finalCount = event.final_nodes?.length ?? 0;
  if (rounds.length === 0 && finalCount === 0) {
    return null;
  }
  const parts = rounds.map(
    (round) =>
      round.friendly_name?.trim() ||
      getCompetitionMethodDisplayLabel(round.competition_method, {
        roundId: round.id,
        relationships,
      })
  );
  if (finalCount > 0) {
    parts.push(finalCount === 1 ? 'Final payouts' : `${finalCount} final payout nodes`);
  }
  return parts.join(' → ');
}

function structureSignatureFromEvent(event: EventComplete): string | null {
  const rounds = [...(event.rounds || [])].sort((a, b) => a.round_number - b.round_number);
  const finalCount = event.final_nodes?.length ?? 0;
  if (rounds.length === 0 && finalCount === 0) {
    return null;
  }
  const roundSig = rounds
    .map(
      (r) =>
        `${r.competition_method}:${r.game_count}:${r.number_of_squads ?? 0}`
    )
    .join(';');
  return `${roundSig}#f${finalCount}`;
}

function structureSignatureFromTemplatePayload(
  payload: Record<string, unknown>
): string | null {
  const roundsRaw = payload.rounds;
  if (!Array.isArray(roundsRaw) || roundsRaw.length === 0) {
    const finals = payload.final_nodes;
    const finalCount = Array.isArray(finals) ? finals.length : 0;
    return finalCount > 0 ? `#f${finalCount}` : null;
  }
  const rounds = [...roundsRaw].sort(
    (a, b) => Number((a as Record<string, unknown>).round_number ?? 0) -
      Number((b as Record<string, unknown>).round_number ?? 0)
  );
  const roundSig = rounds
    .map((raw) => {
      const r = raw as Record<string, unknown>;
      const squadCount = squadsListFromRoundSpec(r).length;
      return `${r.competition_method}:${r.game_count}:${squadCount}`;
    })
    .join(';');
  const finals = payload.final_nodes;
  const finalCount = Array.isArray(finals) ? finals.length : 0;
  return `${roundSig}#f${finalCount}`;
}

export function findMatchingFormatTemplateId(
  event: EventComplete,
  templates: UserEventFormatTemplateRead[]
): number | null {
  const eventSig = structureSignatureFromEvent(event);
  if (!eventSig) return null;
  const matches = templates.filter((t) => {
    const sig = structureSignatureFromTemplatePayload(t.payload);
    return sig != null && sig === eventSig;
  });
  if (matches.length === 1) {
    return matches[0].id;
  }
  if (matches.length > 1) {
    const defaultMatch = matches.find((t) => t.is_default);
    return (defaultMatch ?? matches[0]).id;
  }
  return null;
}

export function getFormatTemplateDisplayLabel(
  templateId: number | null | undefined,
  templates: UserEventFormatTemplateRead[]
): string | null {
  if (templateId == null) return null;
  const template = templates.find((t) => t.id === templateId);
  return template?.name ?? null;
}

export type ResolveAppliedStructureFormatLabelArgs = {
  event: EventComplete;
  templates: UserEventFormatTemplateRead[];
  selectedTemplateId: number | null;
  persistedTemplateId?: number | null;
  relationships?: RoundRelationshipRead[];
};

/**
 * Label for the saved round/advancement structure shown on Event Info.
 * Prefers explicit or persisted template selection, then structural match, then round summary.
 */
export function resolveAppliedStructureFormatLabel(
  args: ResolveAppliedStructureFormatLabelArgs
): string {
  const { event, templates, selectedTemplateId, persistedTemplateId, relationships } = args;

  const explicitLabel = getFormatTemplateDisplayLabel(selectedTemplateId, templates);
  if (explicitLabel) return explicitLabel;

  const persistedLabel = getFormatTemplateDisplayLabel(persistedTemplateId, templates);
  if (persistedLabel) return persistedLabel;

  const matchedId = findMatchingFormatTemplateId(event, templates);
  const matchedLabel = getFormatTemplateDisplayLabel(matchedId, templates);
  if (matchedLabel) return matchedLabel;

  const summary = summarizeEventRoundStructure(event, relationships);
  if (summary) return summary;

  return 'Not selected';
}

export function resolveAppliedFormatTemplateId(
  args: ResolveAppliedStructureFormatLabelArgs
): number | null {
  const { event, templates, selectedTemplateId, persistedTemplateId } = args;
  if (
    selectedTemplateId != null &&
    templates.some((t) => t.id === selectedTemplateId)
  ) {
    return selectedTemplateId;
  }
  if (
    persistedTemplateId != null &&
    templates.some((t) => t.id === persistedTemplateId)
  ) {
    return persistedTemplateId;
  }
  return findMatchingFormatTemplateId(event, templates);
}
