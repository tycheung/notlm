import { useCallback, useState } from 'react';
import type { QueryClient, QueryKey } from '@tanstack/react-query';

import { EventsAPI } from '../../api/events';
import { invalidateEventLaneQueries } from '../../features/lanes';
import type { EventParticipantWithUser } from '../../types/event_participant';
import { getCurrentTimezoneNaiveISOString } from '../../utils/dateUtils';
import type { TeamGroup } from './participantManagementTableModel';

type UseParticipantDeskBulkActionsArgs = {
  eventId: number;
  participantQueryKey: QueryKey;
  queryClient: QueryClient;
  participantGroups: { teams: TeamGroup[] | null };
  setParticipantListInCache: (
    updater: (list: EventParticipantWithUser[]) => EventParticipantWithUser[]
  ) => void;
  beginParticipantPatch: (participantId: number) => void;
  endParticipantPatch: (participantId: number) => void;
  scopedParticipantRefresh: () => void;
  setPatchError: (message: string | null) => void;
  formatSubmitError: (error: unknown) => string;
};

export function useParticipantDeskBulkActions({
  eventId,
  participantQueryKey,
  queryClient,
  participantGroups,
  setParticipantListInCache,
  beginParticipantPatch,
  endParticipantPatch,
  scopedParticipantRefresh,
  setPatchError,
  formatSubmitError,
}: UseParticipantDeskBulkActionsArgs) {
  const [checkInAllSubmitting, setCheckInAllSubmitting] = useState(false);
  const [teamActionTeamId, setTeamActionTeamId] = useState<number | null>(null);

  const handleCheckInAll = useCallback(async () => {
    setCheckInAllSubmitting(true);
    setPatchError(null);
    const previousParticipants = queryClient.getQueryData<EventParticipantWithUser[]>(
      participantQueryKey
    );
    const checkedInAt = getCurrentTimezoneNaiveISOString();
    setParticipantListInCache((list) =>
      list.map((participant) =>
        participant.status === 'approved' && !participant.checked_in
          ? { ...participant, checked_in: true, checked_in_at: checkedInAt }
          : participant
      )
    );
    try {
      await EventsAPI.checkInAllEventParticipants(eventId);
      scopedParticipantRefresh();
      void invalidateEventLaneQueries(queryClient, eventId);
    } catch (error) {
      if (previousParticipants) {
        queryClient.setQueryData(participantQueryKey, previousParticipants);
      }
      setPatchError(formatSubmitError(error));
    } finally {
      setCheckInAllSubmitting(false);
    }
  }, [
    eventId,
    formatSubmitError,
    participantQueryKey,
    queryClient,
    scopedParticipantRefresh,
    setParticipantListInCache,
    setPatchError,
  ]);

  const handleTeamCheckIn = useCallback(
    async (teamId: number) => {
      const team = participantGroups.teams?.find((t) => t.team_id === teamId);
      if (!team) return;
      setTeamActionTeamId(teamId);
      setPatchError(null);
      const memberIds = team.members.map((member) => member.id);
      const previousParticipants = queryClient.getQueryData<EventParticipantWithUser[]>(
        participantQueryKey
      );
      memberIds.forEach(beginParticipantPatch);
      setParticipantListInCache((list) =>
        list.map((participant) =>
          memberIds.includes(participant.id) ? { ...participant, checked_in: true } : participant
        )
      );
      try {
        await Promise.all(
          team.members.map((m) =>
            EventsAPI.updateEventParticipant(eventId, m.id, { checked_in: true })
          )
        );
        scopedParticipantRefresh();
        void invalidateEventLaneQueries(queryClient, eventId);
      } catch (error) {
        if (previousParticipants) {
          queryClient.setQueryData(participantQueryKey, previousParticipants);
        }
        setPatchError(formatSubmitError(error));
      } finally {
        memberIds.forEach(endParticipantPatch);
        setTeamActionTeamId(null);
      }
    },
    [
      beginParticipantPatch,
      endParticipantPatch,
      eventId,
      formatSubmitError,
      participantGroups.teams,
      participantQueryKey,
      queryClient,
      scopedParticipantRefresh,
      setParticipantListInCache,
      setPatchError,
    ]
  );

  const handleTeamMarkAsPaid = useCallback(
    async (teamId: number, entryFee: number) => {
      const team = participantGroups.teams?.find((t) => t.team_id === teamId);
      if (!team) return;
      setTeamActionTeamId(teamId);
      setPatchError(null);
      const memberIds = team.members.map((member) => member.id);
      const previousParticipants = queryClient.getQueryData<EventParticipantWithUser[]>(
        participantQueryKey
      );
      memberIds.forEach(beginParticipantPatch);
      setParticipantListInCache((list) =>
        list.map((participant) =>
          memberIds.includes(participant.id)
            ? { ...participant, paid_amount: entryFee }
            : participant
        )
      );
      try {
        await Promise.all(
          team.members.map((m) =>
            EventsAPI.updateEventParticipant(eventId, m.id, { paid_amount: entryFee })
          )
        );
        scopedParticipantRefresh();
      } catch (error) {
        if (previousParticipants) {
          queryClient.setQueryData(participantQueryKey, previousParticipants);
        }
        setPatchError(formatSubmitError(error));
      } finally {
        memberIds.forEach(endParticipantPatch);
        setTeamActionTeamId(null);
      }
    },
    [
      beginParticipantPatch,
      endParticipantPatch,
      eventId,
      formatSubmitError,
      participantGroups.teams,
      participantQueryKey,
      queryClient,
      scopedParticipantRefresh,
      setParticipantListInCache,
      setPatchError,
    ]
  );

  const handleTeamAccept = useCallback(
    async (teamId: number) => {
      const team = participantGroups.teams?.find((t) => t.team_id === teamId);
      if (!team) return;
      setTeamActionTeamId(teamId);
      setPatchError(null);
      const memberIds = team.members.map((member) => member.id);
      const previousParticipants = queryClient.getQueryData<EventParticipantWithUser[]>(
        participantQueryKey
      );
      memberIds.forEach(beginParticipantPatch);
      setParticipantListInCache((list) =>
        list.map((participant) =>
          memberIds.includes(participant.id)
            ? { ...participant, status: 'approved' }
            : participant
        )
      );
      try {
        await Promise.all(
          team.members.map((m) =>
            EventsAPI.updateEventParticipant(eventId, m.id, { status: 'approved' })
          )
        );
        scopedParticipantRefresh();
      } catch (error) {
        if (previousParticipants) {
          queryClient.setQueryData(participantQueryKey, previousParticipants);
        }
        setPatchError(formatSubmitError(error));
      } finally {
        memberIds.forEach(endParticipantPatch);
        setTeamActionTeamId(null);
      }
    },
    [
      beginParticipantPatch,
      endParticipantPatch,
      eventId,
      formatSubmitError,
      participantGroups.teams,
      participantQueryKey,
      queryClient,
      scopedParticipantRefresh,
      setParticipantListInCache,
      setPatchError,
    ]
  );

  return {
    checkInAllSubmitting,
    teamActionTeamId,
    handleCheckInAll,
    handleTeamCheckIn,
    handleTeamMarkAsPaid,
    handleTeamAccept,
  };
}
