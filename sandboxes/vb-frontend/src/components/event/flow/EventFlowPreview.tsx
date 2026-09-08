import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Card from '../../common/Card';
import SectionTitle from '../../common/SectionTitle';
import Loading from '../../common/Loading';
import Alert from '../../common/Alert';
import TournamentFlowDiagram from './TournamentFlowDiagram';
import { tournamentFlowRelationshipsQueryKey } from './eventFlowQueries';
import { roundRelationshipApi } from '../../../services/roundRelationshipApi';
import { EventsAPI } from '../../../api/events';
import { RoundRead } from '../../../types/round';
import { RoundRelationshipRead } from '../../../types/roundRelationship';
import { FinalNodeRead } from '../../../types/event';
import { useRoundRealtimeStatuses } from '../../../hooks/useRoundRealtimeStatuses';
import type { RoundRealTimeStatus } from '../../../api/rounds';

/** Align node colors with GET /rounds/{id}/real-time-status (unified completion). */
function effectiveRoundStatusFromRealtime(
  rt: RoundRealTimeStatus | undefined,
  persisted: string
): string {
  if (!rt) return persisted;
  if (rt.all_scored || rt.status === 'COMPLETE') return 'completed';
  if (rt.status === 'IN PROGRESS') return 'in_progress';
  if (rt.status === 'NOT STARTED') return 'scheduled';
  return persisted;
}

interface EventFlowPreviewProps {
  eventId: number;
  rounds: RoundRead[] | undefined;
  /** TD/Admin actions (e.g. copy format, manage library) — shown in the card header */
  toolbar?: React.ReactNode;
  /** Compact flow: tap a round node to open live scores */
  onRoundSelect?: (roundId: number) => void;
  /** Compact flow: tap final node to open node-specific results */
  onChampionshipSelect?: (finalNodeId: number) => void;
}

const EventFlowPreview: React.FC<EventFlowPreviewProps> = ({
  eventId,
  rounds,
  toolbar,
  onRoundSelect,
  onChampionshipSelect
}) => {
  const {
    data: relationships = [],
    isPending,
    isError
  } = useQuery({
    queryKey: tournamentFlowRelationshipsQueryKey(eventId),
    queryFn: async () => {
      const data = await roundRelationshipApi.getAllRoundRelationshipsForEvent(eventId);
      return Array.isArray(data) ? (data as RoundRelationshipRead[]) : [];
    },
    enabled: !!eventId && !!rounds?.length,
  });

  const { data: realtimeByRound } = useRoundRealtimeStatuses(eventId, rounds);
  const { data: finalNodes = [] } = useQuery({
    queryKey: ['eventFinalNodes', eventId],
    queryFn: () => EventsAPI.getFinalNodes(eventId),
    enabled: !!eventId && !!rounds?.length,
  });

  const roundsForDiagram = useMemo(() => {
    if (!rounds?.length) return rounds;
    const sorted = [...rounds].sort((a, b) => a.round_number - b.round_number);
    return sorted.map((r) => {
      const rt = realtimeByRound?.[r.id];
      const persisted = r.status || 'scheduled';
      return {
        ...r,
        status: effectiveRoundStatusFromRealtime(rt, persisted),
      } as RoundRead;
    });
  }, [rounds, realtimeByRound]);

  const header = (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-3">
      <div className="min-w-0">
        <SectionTitle size="small" className="mb-1">
          Event flow
        </SectionTitle>
        <p className="text-sm text-text-muted">
          {rounds?.length
            ? 'Round structure and advancement (read-only). Tap a round for live scores and results; clicking on a round also opens on desktop.'
            : 'Choose a saved format to add rounds and advancement, or create a new format.'}
        </p>
      </div>
      {toolbar ? <div className="flex shrink-0 items-center justify-end gap-1">{toolbar}</div> : null}
    </div>
  );

  if (!rounds?.length) {
    return (
      <Card>
        {header}
        <p className="text-sm text-text-muted">No rounds yet.</p>
      </Card>
    );
  }

  return (
    <Card>
      {header}
      {isPending && (
        <div className="flex justify-center py-8">
          <Loading size="medium" />
        </div>
      )}
      {!isPending && isError && (
        <Alert
          variant="warning"
          message="Relationships are unavailable right now. Rounds are still clickable for live scores."
        />
      )}
      {!isPending && roundsForDiagram && (
        <TournamentFlowDiagram
          rounds={roundsForDiagram}
          relationships={isError ? [] : relationships}
          finalNodes={finalNodes as FinalNodeRead[]}
          compact
          onRoundClick={onRoundSelect}
          onChampionsNodeClick={onChampionshipSelect}
        />
      )}
    </Card>
  );
};

export default EventFlowPreview;
