import type { AdvancementPoolRead } from '../api/advancement-pool';
import type {
  ChampionshipPlacement,
  ChampionshipResultsByNodeResponse,
  FinalNodeRead,
} from '../types/event';
import { formatPlacementOrdinal } from './advancementCalculator';
import { buildEventParticipantIdToTeamIdMap } from './advancementPoolTeams';
import type { EventTeamWithMembers } from '../types/event_team';

export type AdvancementDestinationKind = 'round' | 'final_node';

export interface AdvancementDestination {
  kind: AdvancementDestinationKind;
  label: string;
  relationshipId: number;
  placement?: number;
}

export type AdvancementDestinationMap = Map<string, AdvancementDestination[]>;

export function participantDestinationKey(eventParticipantId: number): string {
  return `ep:${eventParticipantId}`;
}

export function teamDestinationKey(teamId: number): string {
  return `team:${teamId}`;
}

function roundLabel(
  targetRoundId: number,
  rounds: Array<{ id: number; friendly_name?: string | null; round_number?: number | null; name?: string }>
): string {
  const r = rounds.find((row) => Number(row.id) === Number(targetRoundId));
  if (!r) return `Round ${targetRoundId}`;
  const name = r.friendly_name || r.name;
  if (name) return name;
  if (r.round_number != null) return `Round ${r.round_number}`;
  return `Round ${targetRoundId}`;
}

function appendDestination(
  map: AdvancementDestinationMap,
  key: string,
  dest: AdvancementDestination
): void {
  const existing = map.get(key) ?? [];
  const dup = existing.some(
    (d) =>
      d.kind === dest.kind &&
      d.label === dest.label &&
      d.relationshipId === dest.relationshipId &&
      d.placement === dest.placement
  );
  if (!dup) {
    existing.push(dest);
    map.set(key, existing);
  }
}

export interface BuildAdvancementDestinationMapArgs {
  selectedRoundId: number;
  outgoingRelationships: Array<{
    id: number;
    target_round_id?: number | null;
    final_node_id?: number | null;
  }>;
  poolByRelationshipId: Record<number, AdvancementPoolRead[]>;
  championshipResults?: ChampionshipResultsByNodeResponse | null;
  rounds: Array<{ id: number; friendly_name?: string | null; round_number?: number | null; name?: string }>;
  finalNodes: FinalNodeRead[];
  teams?: EventTeamWithMembers[];
}

export function buildAdvancementDestinationMap(
  args: BuildAdvancementDestinationMapArgs
): AdvancementDestinationMap {
  const map: AdvancementDestinationMap = new Map();
  const epToTeam =
    args.teams && args.teams.length > 0
      ? buildEventParticipantIdToTeamIdMap(args.teams)
      : new Map<number, number>();

  for (const rel of args.outgoingRelationships) {
    const relId = Number(rel.id);
    if (!relId) continue;

    if (rel.target_round_id) {
      const label = roundLabel(Number(rel.target_round_id), args.rounds);
      const entries = args.poolByRelationshipId[relId] ?? [];
      for (const row of entries) {
        if (Number(row.source_round_id) !== Number(args.selectedRoundId)) continue;
        const epId = Number(row.event_participant_id);
        if (!Number.isFinite(epId)) continue;
        const dest: AdvancementDestination = {
          kind: 'round',
          label,
          relationshipId: relId,
        };
        appendDestination(map, participantDestinationKey(epId), dest);
        const teamId = epToTeam.get(epId);
        if (teamId != null) {
          appendDestination(map, teamDestinationKey(teamId), dest);
        }
      }
      continue;
    }

    if (!rel.final_node_id) continue;
    const nodeId = Number(rel.final_node_id);
    const node = args.finalNodes.find((n) => Number(n.id) === nodeId);
    const nodeName = node?.name ?? `Final node ${nodeId}`;
    const nodeBlock = args.championshipResults?.final_nodes?.find(
      (n) => Number(n.final_node_id) === nodeId
    );
    const placements = (nodeBlock?.placements ?? []).filter(
      (p) => Number(p.source_round_id) === Number(args.selectedRoundId)
    );
    for (const placement of placements) {
      addPlacementToMap(map, placement, nodeName, relId, epToTeam);
    }
  }

  return map;
}

function addPlacementToMap(
  map: AdvancementDestinationMap,
  placement: ChampionshipPlacement,
  nodeName: string,
  relationshipId: number,
  epToTeam: Map<number, number>
): void {
  const placementNum = Number(placement.placement);
  const ordinal =
    Number.isFinite(placementNum) && placementNum > 0
      ? formatPlacementOrdinal(placementNum)
      : null;
  const label = ordinal ? `${nodeName} (${ordinal})` : nodeName;
  const dest: AdvancementDestination = {
    kind: 'final_node',
    label,
    relationshipId,
    placement: Number.isFinite(placementNum) ? placementNum : undefined,
  };

  const winner = placement.winner;
  const epId = Number(winner?.event_participant_id);
  if (Number.isFinite(epId) && epId > 0) {
    appendDestination(map, participantDestinationKey(epId), dest);
    const teamId = winner?.team_id ?? epToTeam.get(epId);
    if (teamId != null && Number(teamId) > 0) {
      appendDestination(map, teamDestinationKey(Number(teamId)), dest);
    }
  }

  const teamIdFromWinner = Number(winner?.team_id);
  if (Number.isFinite(teamIdFromWinner) && teamIdFromWinner > 0) {
    appendDestination(map, teamDestinationKey(teamIdFromWinner), dest);
  }

  for (const member of placement.team_members ?? []) {
    const memberEp = Number(member?.event_participant_id);
    if (Number.isFinite(memberEp) && memberEp > 0) {
      appendDestination(map, participantDestinationKey(memberEp), dest);
    }
  }
}

export function getDestinationsForParticipant(
  map: AdvancementDestinationMap,
  eventParticipantId: number
): AdvancementDestination[] {
  return map.get(participantDestinationKey(eventParticipantId)) ?? [];
}

export function getDestinationsForTeam(
  map: AdvancementDestinationMap,
  teamId: number
): AdvancementDestination[] {
  return map.get(teamDestinationKey(teamId)) ?? [];
}
