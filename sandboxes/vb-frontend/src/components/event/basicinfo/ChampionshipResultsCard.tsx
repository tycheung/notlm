import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Card from '../../common/Card';
import SectionTitle from '../../common/SectionTitle';
import Button from '../../common/Button';
import Loading from '../../common/Loading';
import Alert from '../../common/Alert';
import { getErrorMessage } from '../../../api/apiErrors';
import { EventsAPI } from '../../../api/events';
import { EventComplete, EventFormat } from '../../../types/event';

/** Matches backend `CHAMPION_RANK_BASE` — internal sort key, not for display. */
const ELIMINATION_CHAMPION_RANK_BASE = 1_000_000;

type ChampionshipTeamMember = {
  event_participant_id?: number | null;
  user_id?: number | null;
  display_name?: string | null;
};

/**
 * Championship placements store raw criteria sort keys. For elimination-order
 * finishes that key is 1_000_000+ for the champion and match display_order for
 * everyone else — not useful as a number in the UI.
 */
function formatPlacementCriteria(
  criteriaType: string | null | undefined,
  criteriaValue: number | null | undefined
): string {
  const type = String(criteriaType || '')
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

  if (type === 'elimination_order') {
    if (typeof criteriaValue !== 'number' || !Number.isFinite(criteriaValue)) {
      return 'Ladder finish';
    }
    if (criteriaValue >= ELIMINATION_CHAMPION_RANK_BASE) {
      return 'Champion';
    }
    if (criteriaValue < 0) {
      return 'Ladder finish';
    }
    return `Eliminated in match ${Math.round(criteriaValue) + 1}`;
  }

  const label = criteriaType?.replace(/_/g, ' ') ?? '—';
  if (typeof criteriaValue === 'number' && Number.isFinite(criteriaValue)) {
    return `${label} · ${criteriaValue.toFixed(2)}`;
  }
  return label;
}

function stableTeamMemberNames(members: ChampionshipTeamMember[]): string {
  return [...members]
    .sort((a, b) => {
      const aId = Number(a.event_participant_id ?? a.user_id ?? 0);
      const bId = Number(b.event_participant_id ?? b.user_id ?? 0);
      return aId - bId;
    })
    .map((m) => m.display_name)
    .filter(Boolean)
    .join(', ');
}

interface ChampionshipResultsCardProps {
  eventId: number;
  eventComplete: EventComplete;
  /** TD/Admin for this event — can trigger backend recompute */
  canRecompute: boolean;
  finalNodeId?: number | null;
}

const ChampionshipResultsCard: React.FC<ChampionshipResultsCardProps> = ({
  eventId,
  eventComplete,
  canRecompute,
  finalNodeId,
}) => {
  const queryClient = useQueryClient();
  const [recomputeError, setRecomputeError] = useState<string | null>(null);

  const {
    data: results,
    isLoading,
    isError,
    error
  } = useQuery({
    queryKey: ['eventChampionshipResults', eventId],
    queryFn: () => EventsAPI.getEventChampionshipResults(eventId),
    enabled: !!eventId,
    refetchInterval: 15000,
  });

  const recomputeMutation = useMutation({
    mutationFn: () => EventsAPI.recomputeEventChampionshipResults(eventId),
    onSuccess: () => {
      setRecomputeError(null);
      queryClient.invalidateQueries({ queryKey: ['eventChampionshipResults', eventId] });
      queryClient.invalidateQueries({ queryKey: ['eventPrizeDistribution', eventId] });
      queryClient.invalidateQueries({ queryKey: ['eventComplete', eventId] });
    },
    onError: (err: unknown) => {
      setRecomputeError(getErrorMessage(err, 'Failed to recompute championship results.'));
    }
  });

  const isTeamEvent = eventComplete.event_format === EventFormat.TEAMS;
  const selectedNode = finalNodeId != null
    ? results?.final_nodes?.find((node) => node.final_node_id === finalNodeId)
    : results?.final_nodes?.[0];
  const placements = selectedNode?.placements ?? [];
  const hasRelationship = Boolean(selectedNode);

  return (
    <Card>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <SectionTitle className="mb-1">Championship results</SectionTitle>
          <p className="text-sm text-text-muted">
            Final placements from the selected final node. Recompute after
            scores or flow criteria change.
          </p>
        </div>
        {canRecompute && (
          <Button
            type="button"
            variant="lightbackground"
            size="small"
            className="shrink-0"
            disabled={recomputeMutation.isPending}
            onClick={() => recomputeMutation.mutate()}
          >
            {recomputeMutation.isPending ? 'Recomputing…' : 'Recompute championship'}
          </Button>
        )}
      </div>

      {recomputeError && (
        <Alert variant="error" message={recomputeError} onDismiss={() => setRecomputeError(null)} className="mt-3" />
      )}

      {isLoading && (
        <div className="flex justify-center py-8">
          <Loading size="medium" />
        </div>
      )}

      {!isLoading && isError && (
        <Alert
          variant="error"
          message={getErrorMessage(error, 'Could not load championship results.')}
          className="mt-3"
        />
      )}

      {!isLoading && !isError && !hasRelationship && (
        <p className="mt-3 text-sm text-text-muted">
          No final-node results are available yet. Add a round connection to a final node in Event
          Flow and complete source-round scoring.
        </p>
      )}

      {!isLoading && !isError && hasRelationship && placements.length === 0 && (
        <p className="mt-3 text-sm text-text-muted">
          No placements recorded yet. Complete scoring for the source round, then recompute
          championship if needed.
        </p>
      )}

      {!isLoading && !isError && placements.length > 0 && (
        <ul className="mt-4 space-y-3">
          {placements
            .slice()
            .sort((a, b) => a.placement - b.placement)
            .map((row) => {
              const standingsTitle = row.standings_label
                ? row.standings_label.replace(/ Place$/i, ' place')
                : null;
              const name =
                row.winner?.display_name ||
                (isTeamEvent && row.team_members?.length
                  ? `Team #${row.winner?.team_id ?? ''}`
                  : 'TBD');
              return (
                <li
                  key={row.id}
                  className="rounded-lg border border-border bg-surface-light px-3 py-2.5"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    {standingsTitle ? (
                      <span className="font-medium text-text">{standingsTitle}</span>
                    ) : (
                      <span className="font-medium text-text">{name}</span>
                    )}
                    <span className="text-xs text-text-muted">
                      {formatPlacementCriteria(row.criteria_type, row.criteria_value)}
                    </span>
                  </div>
                  {standingsTitle && (
                    <div className="mt-1 text-sm text-text">{name}</div>
                  )}
                  {isTeamEvent && row.team_members && row.team_members.length > 0 && (
                    <div className="mt-1 text-xs text-text-muted">
                      Members: {stableTeamMemberNames(row.team_members)}
                    </div>
                  )}
                </li>
              );
            })}
        </ul>
      )}
    </Card>
  );
};

export default ChampionshipResultsCard;
