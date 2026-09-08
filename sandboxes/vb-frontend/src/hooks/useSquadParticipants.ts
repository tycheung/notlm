import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SquadsAPI } from '../api/squads';

interface UseSquadParticipantsProps {
  /** Active round; participants are loaded for all squads in this round in one request */
  roundId: number | null;
}

interface UseSquadParticipantsReturn {
  squadParticipants: { [squadId: number]: any[] };
  isLoadingSquadParticipants: boolean;
}

export const useSquadParticipants = ({
  roundId,
}: UseSquadParticipantsProps): UseSquadParticipantsReturn => {
  const { data, isLoading } = useQuery({
    queryKey: ['squadParticipants', roundId],
    queryFn: () => SquadsAPI.getRoundParticipants(roundId as number),
    enabled: roundId != null && roundId > 0,
    staleTime: 0,
    gcTime: 0,
  });

  const squadParticipants = useMemo(() => {
    const map: { [squadId: number]: any[] } = {};
    if (!data?.squads) {
      return map;
    }
    for (const squad of data.squads) {
      map[squad.squad_id] = squad.participants || [];
    }
    return map;
  }, [data]);

  return {
    squadParticipants,
    isLoadingSquadParticipants: isLoading,
  };
};
