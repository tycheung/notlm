import type { FinalNodeRead, PrizeAllocationStep } from '../types/event';
import type { RoundRead } from '../types/round';
import {
  AdvancementFilter,
  AdvancementMethod,
  DuplicateAdvancementPolicy,
  RoundRelationshipRead,
  type AdvancementMethodConfig,
} from '../types/roundRelationship';
import type { EventStructurePayload } from '../constants/defaultEventStructurePayload';
import { DEFAULT_ROUND_FORMAT_NAME } from '../constants/roundFormatDefaults';
import {
  defaultSquadNameForRound,
  type RoundLabelSource,
} from './roundDisplayLabel';
import { resolvePodsAdvancementCount } from '../components/event/formatEditor/podsMatchupsUtils';

const MATCH_PLAY_METHODS = new Set<AdvancementMethod>([
  AdvancementMethod.BRACKET,
  AdvancementMethod.STEPLADDER,
  AdvancementMethod.ROUND_ROBIN,
]);

/** Stable negative id for diagram edges / nodes from template ref strings. */
export function refToSyntheticId(ref: string): number {
  let h = 0;
  for (let i = 0; i < ref.length; i++) {
    h = (Math.imul(31, h) + ref.charCodeAt(i)) | 0;
  }
  return h <= 0 ? h : -h;
}

export function squadsListFromRoundSpec(spec: Record<string, unknown>): { name: string; max_participants: number }[] {
  const roundLabel: RoundLabelSource = {
    round_number: Number(spec.round_number ?? 0) || undefined,
    friendly_name: spec.friendly_name as string | undefined,
  };
  const squads = spec.squads;
  if (Array.isArray(squads) && squads.length > 0) {
    return squads.map((s, i) => {
      const row = s as Record<string, unknown>;
      const templateName = row.name != null ? String(row.name) : undefined;
      return {
        name: defaultSquadNameForRound(roundLabel, {
          squadIndex: i,
          squadCount: squads.length,
          templateName,
        }),
        max_participants: Math.max(1, Number(row.max_participants ?? 24)),
      };
    });
  }
  const legacy = spec.squad as Record<string, unknown> | undefined;
  if (legacy && typeof legacy === 'object') {
    const templateName = legacy.name != null ? String(legacy.name) : undefined;
    return [
      {
        name: defaultSquadNameForRound(roundLabel, { templateName }),
        max_participants: Math.max(1, Number(legacy.max_participants ?? 24)),
      },
    ];
  }
  const rn = Number(spec.round_number ?? 1);
  return [
    {
      name: defaultSquadNameForRound({ round_number: rn, friendly_name: spec.friendly_name as string }),
      max_participants: 24,
    },
  ];
}

/** Keep payload round spec consistent: `squads` + legacy `squad` (first row). */
export function syncRoundSquadsFields(spec: Record<string, unknown>): void {
  const list = squadsListFromRoundSpec(spec);
  spec.squads = list;
  spec.squad = list[0] ? { ...list[0] } : { name: 'Squad', max_participants: 24 };
  spec.number_of_squads = list.length;
}

/** Every playable round in a saved/applied format gets at least one squad. */
export function ensurePayloadRoundsHaveSquads(
  payload: EventStructurePayload
): EventStructurePayload {
  const rounds = (payload.rounds || []).map((round) => {
    const next = { ...round };
    syncRoundSquadsFields(next);
    return next;
  });
  return { ...payload, rounds };
}

/**
 * Keep a round's scoring model in sync with its competition method.
 * Match-play methods cannot use an eliminator/pinfall RoundFormat.
 */
export function syncRoundScoringFields(spec: Record<string, unknown>): void {
  const method = String(spec.competition_method || AdvancementMethod.ELIMINATOR)
    .trim()
    .toLowerCase()
    .replace(/-/g, '_') as AdvancementMethod;

  if (!MATCH_PLAY_METHODS.has(method)) {
    delete spec.score_type;
    delete spec.race_to_wins;
    delete spec.max_games;
    spec.round_format_name = spec.round_format_name || DEFAULT_ROUND_FORMAT_NAME;
    return;
  }

  const cfg = (spec.competition_method_config as Record<string, unknown> | undefined) || {};
  const decisionMode = String(
    cfg.series_decision_mode ||
      (method === AdvancementMethod.ROUND_ROBIN ? 'games_total' : 'race_to_wins')
  )
    .trim()
    .toLowerCase();
  // Prefer explicit per-match series length. Never let derived max_games win —
  // that made RR "games per match" snap back to schedule length (e.g. 32).
  const configuredGames = Math.max(
    1,
    Number(
      (method === AdvancementMethod.ROUND_ROBIN
        ? cfg.games_per_match ?? cfg.game_count ?? spec.game_count
        : cfg.game_count ?? spec.game_count) ?? spec.max_games
    ) || 1
  );

  if (decisionMode === 'games_total') {
    // Fixed-length series: bowl all games; winner by total pinfall.
    spec.score_type = 'match_play';
    spec.race_to_wins = 1;
    spec.max_games = configuredGames;
    spec.game_count = configuredGames;
    cfg.game_count = configuredGames;
    cfg.series_decision_mode = 'games_total';
    if (method === AdvancementMethod.ROUND_ROBIN) {
      cfg.games_per_match = configuredGames;
    }
    spec.competition_method_config = cfg;
    delete spec.round_format_name;
    return;
  }

  const raceToWins = Math.max(
    1,
    Number(spec.race_to_wins ?? cfg.race_to_wins) || Math.ceil(configuredGames / 2) || 2
  );
  spec.score_type = 'match_play';
  spec.race_to_wins = raceToWins;
  spec.max_games = Math.max(configuredGames, raceToWins * 2 - 1);
  cfg.series_decision_mode = 'race_to_wins';
  if (cfg.race_to_wins == null) cfg.race_to_wins = raceToWins;
  cfg.game_count = configuredGames;
  if (method === AdvancementMethod.ROUND_ROBIN) {
    cfg.games_per_match = configuredGames;
  }
  spec.competition_method_config = cfg;
  delete spec.round_format_name;
}

/**
 * Mirror the backend final-node reconciliation for fixed-count exit relationships.
 * Percentage-only exits do not define a fixed number of placement positions.
 */
export function syncFinalNodePlacementCounts(
  payload: EventStructurePayload
): EventStructurePayload {
  const relationships = payload.relationships as Record<string, unknown>[];
  let hasChanges = false;

  const finalNodes = ((payload.final_nodes || []) as Record<string, unknown>[]).map(
    (finalNode) => {
      const ref = String(finalNode.ref ?? '');
      const fixedCounts = relationships
        .filter((relationship) => String(relationship.target_final_ref ?? '') === ref)
        .filter(
          (relationship) =>
            Number(relationship.advancement_count ?? 0) > 0 &&
            Number(relationship.advancement_percentage ?? 0) === 0
        )
        .map((relationship) => Number(relationship.advancement_count));

      if (fixedCounts.length === 0) {
        return finalNode;
      }

      const placementCount = fixedCounts.reduce((total, count) => total + count, 0);
      if (Number(finalNode.placement_count ?? 0) === placementCount) {
        return finalNode;
      }

      hasChanges = true;
      return { ...finalNode, placement_count: placementCount };
    }
  );

  return hasChanges ? { ...payload, final_nodes: finalNodes } : payload;
}

function incomingEntrantCountForRoundRef(
  targetRef: string,
  relationships: Record<string, unknown>[]
): number | null {
  const counts = relationships
    .filter((rel) => String(rel.target_ref ?? '') === targetRef)
    .map((rel) => Number(rel.advancement_count ?? 0))
    .filter((count) => count > 0);
  if (!counts.length) return null;
  return counts.reduce((total, count) => total + count, 0);
}

/**
 * Pods rounds advance a per-pod total (not a single global top-N). Sync outgoing
 * relationship advancement_count so the format canvas and pool hints match.
 */
export function syncPodsRelationshipAdvancementCounts(
  payload: EventStructurePayload
): EventStructurePayload {
  const rounds = (payload.rounds || []) as Record<string, unknown>[];
  const relationships = (payload.relationships || []) as Record<string, unknown>[];
  if (!rounds.length || !relationships.length) return payload;

  const roundByRef = new Map(rounds.map((round) => [String(round.ref ?? ''), round]));
  let hasChanges = false;

  const nextRelationships = relationships.map((rel) => {
    const sourceRef = String(rel.source_ref ?? '');
    const sourceRound = roundByRef.get(sourceRef);
    if (!sourceRound) return rel;
    if (String(sourceRound.competition_method ?? '').toLowerCase() !== AdvancementMethod.PODS) {
      return rel;
    }
    if (!rel.target_ref) return rel;

    const methodConfig = (sourceRound.competition_method_config || {}) as Record<string, unknown>;
    const entrantCount = incomingEntrantCountForRoundRef(sourceRef, relationships);
    const resolved = resolvePodsAdvancementCount({ methodConfig, entrantCount });
    if (resolved == null || resolved <= 0) return rel;
    if (Number(rel.advancement_count ?? 0) === resolved) return rel;

    hasChanges = true;
    return { ...rel, advancement_count: resolved };
  });

  return hasChanges ? { ...payload, relationships: nextRelationships } : payload;
}

export function syncStructurePayloadCounts(
  payload: EventStructurePayload
): EventStructurePayload {
  return syncFinalNodePlacementCounts(syncPodsRelationshipAdvancementCounts(payload));
}

export function payloadToFlowViewModel(payload: EventStructurePayload): {
  rounds: RoundRead[];
  relationships: RoundRelationshipRead[];
  finalNodes: FinalNodeRead[];
  refToRoundId: Map<string, number>;
  refToFinalId: Map<string, number>;
} {
  const roundsRaw = (payload.rounds || []) as Record<string, unknown>[];
  const refToRoundId = new Map<string, number>();
  roundsRaw.forEach((r) => {
    const ref = String(r.ref || '');
    if (ref) refToRoundId.set(ref, refToSyntheticId(ref));
  });

  const finalRaw = (payload.final_nodes || []) as Record<string, unknown>[];
  const refToFinalId = new Map<string, number>();
  finalRaw.forEach((fn) => {
    const ref = String(fn.ref || '');
    if (ref) refToFinalId.set(ref, refToSyntheticId(ref));
  });

  const rounds: RoundRead[] = roundsRaw.map((r) => {
    const ref = String(r.ref || 'round');
    const id = refToSyntheticId(ref);
    const cmRaw = String(r.competition_method || AdvancementMethod.ELIMINATOR);
    let competition_method = AdvancementMethod.ELIMINATOR;
    if ((Object.values(AdvancementMethod) as string[]).includes(cmRaw)) {
      competition_method = cmRaw as AdvancementMethod;
    }
    const compCfg = (r.competition_method_config ?? null) as AdvancementMethodConfig | null;
    return {
      id,
      event_id: 0,
      round_number: Number(r.round_number ?? 1),
      friendly_name: (r.friendly_name as string) ?? null,
      format_id: 1,
      game_count: Number(r.game_count ?? 3),
      number_of_squads: squadsListFromRoundSpec(r).length,
      status: 'scheduled',
      notes: (r.notes as string) ?? null,
      allows_reentry: Boolean(r.allows_reentry),
      max_reentries: null,
      reentry_fee: null,
      competition_method,
      competition_method_config: compCfg,
      created_at: '',
      updated_at: null,
    };
  });

  const finalNodes: FinalNodeRead[] = finalRaw.map((fn) => {
    const ref = String(fn.ref || 'final');
    const id = refToSyntheticId(ref);
    const placement_count = Number(fn.placement_count ?? 3);
    const prize_allocation_steps: PrizeAllocationStep[] = Array.isArray(fn.prize_allocation_steps)
      ? (fn.prize_allocation_steps as PrizeAllocationStep[])
      : [];
    return {
      id,
      event_id: 0,
      name: String(fn.name || ref),
      description: (fn.description as string) ?? null,
      display_order: Number(fn.display_order ?? 0),
      is_active: fn.is_active !== false,
      placement_count,
      node_pool_type: (fn.node_pool_type as FinalNodeRead['node_pool_type']) || 'percentage',
      node_pool_value: Number(fn.node_pool_value ?? 100),
      prize_allocation_steps,
      created_at: '',
      updated_at: null,
    };
  });

  const relsRaw = (payload.relationships || []) as Record<string, unknown>[];
  const relationships: RoundRelationshipRead[] = relsRaw.map((rel, idx) => {
    const srcRef = String(rel.source_ref || '');
    const tgtRef = rel.target_ref != null ? String(rel.target_ref) : '';
    const tgtFinal = rel.target_final_ref != null ? String(rel.target_final_ref) : '';
    const carryOverEnabled = Boolean(rel.carry_over_enabled);
    const srcId = refToRoundId.get(srcRef) ?? refToSyntheticId(srcRef);
    const tgtId = tgtRef ? refToRoundId.get(tgtRef) ?? refToSyntheticId(tgtRef) : undefined;
    const fnId = tgtFinal ? refToFinalId.get(tgtFinal) ?? refToSyntheticId(tgtFinal) : undefined;

    const af = String(rel.advancement_filter || 'winners').toLowerCase();
    const filterVal = (Object.values(AdvancementFilter) as string[]).includes(af)
      ? (af as AdvancementFilter)
      : AdvancementFilter.WINNERS;

    const dupRaw = String(rel.duplicate_advancement_policy || 'single_and_promote').toLowerCase();
    const dupVal = (Object.values(DuplicateAdvancementPolicy) as string[]).includes(dupRaw)
      ? (dupRaw as DuplicateAdvancementPolicy)
      : DuplicateAdvancementPolicy.SINGLE_AND_PROMOTE;

    return {
      id: -(100000 + idx),
      source_round_id: srcId,
      target_round_id: tgtFinal ? null : tgtId ?? null,
      final_node_id: tgtFinal ? fnId ?? null : null,
      advancement_filter: filterVal,
      advancement_count: rel.advancement_count as number | undefined,
      advancement_percentage: rel.advancement_percentage as number | undefined,
      min_advancement_count: rel.min_advancement_count as number | undefined,
      at_large_advancement_count: rel.at_large_advancement_count as number | undefined,
      advancement_type: rel.advancement_type as string | undefined,
      tiebreaker_rule: rel.tiebreaker_rule as string | undefined,
      advancement_score_basis: rel.advancement_score_basis as 'scratch' | 'handicap' | undefined,
      carry_over_enabled: carryOverEnabled,
      advancement_score_scope: rel.advancement_score_scope as
        | 'source_round'
        | 'all_rounds'
        | undefined,
      delay_rounds: Number(rel.delay_rounds ?? 0),
      description: (rel.description as string) || undefined,
      is_active: rel.is_active !== false,
      execution_order: Number(rel.execution_order ?? 0),
      duplicate_advancement_policy: dupVal,
      created_at: '',
      updated_at: undefined,
    };
  });

  return { rounds, relationships, finalNodes, refToRoundId, refToFinalId };
}

export function isSupportedPayloadVersion(v: unknown): boolean {
  return v === 2;
}
