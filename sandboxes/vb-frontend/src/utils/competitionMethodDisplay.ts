import { AdvancementMethod } from '../types/roundRelationship';

export interface CompetitionMethodRelationship {
  source_round_id?: number | null;
  target_round_id?: number | null;
  source_ref?: unknown;
  target_ref?: unknown;
}

export interface CompetitionMethodDisplayContext {
  roundId?: number;
  roundRef?: string;
  relationships?: readonly (
    | CompetitionMethodRelationship
    | Record<string, unknown>
  )[];
}

function hasValue(value: unknown): boolean {
  return value != null && String(value).trim() !== '';
}

export function hasOutgoingRoundRelationship(
  context: CompetitionMethodDisplayContext
): boolean {
  const { roundId, roundRef, relationships = [] } = context;

  return relationships.some((relationship) => {
    if (roundId != null) {
      return (
        Number(relationship.source_round_id) === roundId &&
        relationship.target_round_id != null &&
        Number(relationship.target_round_id) > 0
      );
    }

    if (roundRef != null) {
      return (
        String(relationship.source_ref ?? '') === roundRef &&
        hasValue(relationship.target_ref)
      );
    }

    return false;
  });
}

export function getCompetitionMethodDisplayLabel(
  method: string | null | undefined,
  context: CompetitionMethodDisplayContext = {}
): string {
  if (!method) {
    return 'Round';
  }

  const normalizedMethod = method.trim().toLowerCase();
  if (normalizedMethod === AdvancementMethod.ELIMINATOR) {
    return hasOutgoingRoundRelationship(context) ? 'Qualifier' : 'Eliminator';
  }
  if (normalizedMethod === AdvancementMethod.PODS || normalizedMethod === 'pods') {
    return 'Pods (Beat the pair)';
  }

  return normalizedMethod
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
