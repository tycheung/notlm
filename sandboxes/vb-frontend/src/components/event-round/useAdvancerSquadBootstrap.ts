import { useCallback, useEffect, useMemo, useRef } from 'react';
import { SquadCreate, SquadRead, SquadStatus, SquadUpdate } from '../../types/squad';
import { getLaterOfEventStartOrNow, toTimezoneNaiveISO } from '../../utils/dateUtils';
import {
  defaultSquadNameForRound,
  formatRoundDisplayLabel,
  isGenericSquadTemplateName,
} from '../../utils/roundDisplayLabel';

type RoundLike = {
  id?: number;
  round_number?: number | null;
  friendly_name?: string | null;
  game_count?: number | null;
};

type ParticipantLike = { id: number };

type DragDropAssignment = {
  item: { id: number; data: ParticipantLike };
  fromCategoryId: string;
  toCategoryId: string;
};

type UseAdvancerSquadBootstrapArgs = {
  squadsSurface: boolean;
  isAuthorizedForManagement: boolean;
  loadingSquads: boolean;
  selectedRoundId: number | null;
  eventComplete: { rounds?: RoundLike[]; start_date?: string | null } | null | undefined;
  squads: SquadRead[];
  allEventSquads: SquadRead[];
  unassignedParticipants: ParticipantLike[];
  hasIncomingRelationships: boolean;
  createSquad: (body: SquadCreate) => void;
  createSquadPending: boolean;
  updateSquad: (args: { id: number; body: SquadUpdate }) => void;
  handleDragDropAssignment: (result: DragDropAssignment) => void;
};

export function useAdvancerSquadBootstrap({
  squadsSurface,
  isAuthorizedForManagement,
  loadingSquads,
  selectedRoundId,
  eventComplete,
  squads,
  allEventSquads,
  unassignedParticipants,
  hasIncomingRelationships,
  createSquad,
  createSquadPending,
  updateSquad,
  handleDragDropAssignment,
}: UseAdvancerSquadBootstrapArgs) {
  const assignableAdvancerSquad = useMemo(
    () => squads.find((s) => !s.locked_in) ?? null,
    [squads]
  );

  const selectedRound = useMemo(() => {
    if (!selectedRoundId || !Array.isArray(eventComplete?.rounds)) return null;
    return (
      eventComplete.rounds.find((r) => Number(r.id) === Number(selectedRoundId)) ?? null
    );
  }, [eventComplete?.rounds, selectedRoundId]);

  const selectedRoundDisplayLabel = useMemo(
    () => formatRoundDisplayLabel(selectedRound),
    [selectedRound]
  );

  const expectedSquadNameForRound = useMemo(
    () => defaultSquadNameForRound(selectedRound),
    [selectedRound]
  );

  const autoCreatedSquadRoundRef = useRef<Set<number>>(new Set());
  useEffect(() => {
    if (!squadsSurface || !isAuthorizedForManagement) return;
    if (loadingSquads || !selectedRoundId || !selectedRound) return;
    if (squads.length > 0) return;
    if (!hasIncomingRelationships) return;
    if ((unassignedParticipants?.length ?? 0) === 0) return;
    const gameCount = Number(selectedRound.game_count || 0);
    if (gameCount < 1) return;
    if (createSquadPending) return;
    if (autoCreatedSquadRoundRef.current.has(selectedRoundId)) return;
    autoCreatedSquadRoundRef.current.add(selectedRoundId);

    const sibling = (allEventSquads || []).find((s) => Boolean(s.start_datetime));
    const start_datetime = sibling?.start_datetime
      ? String(sibling.start_datetime).slice(0, 19)
      : toTimezoneNaiveISO(getLaterOfEventStartOrNow(eventComplete?.start_date)).slice(0, 19);

    const body: SquadCreate = {
      name: expectedSquadNameForRound,
      round_id: selectedRoundId,
      start_datetime,
      max_participants: Math.max(24, unassignedParticipants.length),
      game_count: gameCount,
      status: SquadStatus.SCHEDULED,
      allows_reentry: false,
    };
    createSquad(body);
  }, [
    allEventSquads,
    createSquadPending,
    eventComplete?.start_date,
    expectedSquadNameForRound,
    hasIncomingRelationships,
    isAuthorizedForManagement,
    loadingSquads,
    selectedRound,
    selectedRoundId,
    squads.length,
    squadsSurface,
    unassignedParticipants.length,
  ]);

  const handleAssignAllAdvancersToSquad = useCallback(() => {
    if (!assignableAdvancerSquad || unassignedParticipants.length === 0) return;
    const targetSquadId = assignableAdvancerSquad.id.toString();
    unassignedParticipants.forEach((participant) => {
      handleDragDropAssignment({
        item: { id: participant.id, data: participant },
        fromCategoryId: 'unassigned',
        toCategoryId: targetSquadId,
      });
    });
  }, [assignableAdvancerSquad, unassignedParticipants, handleDragDropAssignment]);

  const legacySquadNameSyncRef = useRef<Set<number>>(new Set());
  useEffect(() => {
    if (!squadsSurface || !selectedRound || !assignableAdvancerSquad) return;
    if (assignableAdvancerSquad.locked_in) return;
    if (squads.filter((s) => !s.locked_in).length !== 1) return;
    if (legacySquadNameSyncRef.current.has(assignableAdvancerSquad.id)) return;

    const expected = defaultSquadNameForRound(selectedRound);
    const current = String(assignableAdvancerSquad.name ?? '').trim();
    if (!expected || current.toLowerCase() === expected.toLowerCase()) return;
    if (!isGenericSquadTemplateName(current, selectedRound)) return;

    legacySquadNameSyncRef.current.add(assignableAdvancerSquad.id);
    updateSquad({
      id: assignableAdvancerSquad.id,
      body: { name: expected },
    });
  }, [squadsSurface, selectedRound, assignableAdvancerSquad, squads, updateSquad]);

  return {
    assignableAdvancerSquad,
    selectedRoundDisplayLabel,
    expectedSquadNameForRound,
    handleAssignAllAdvancersToSquad,
  };
}
