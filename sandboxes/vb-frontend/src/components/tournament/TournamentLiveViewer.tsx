import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { EventsAPI } from '../../api/events';
import { useAuth } from '../../contexts/AuthContext';
import { useRoleAwareNavigation } from '../../utils/roleBasedRouting';
import { getErrorMessage } from '../../api/apiErrors';
import Alert from '../common/Alert';
import Button from '../common/Button';
import Loading from '../common/Loading';
import PageSectionHeading from '../common/PageSectionHeading';
import PublicLiveRoundsList from './PublicLiveRoundsList';
import RoundLiveScoresModal from '../event/basicinfo/RoundLiveScoresModal';
import PublicLiveSideActionsBoard from '../side_actions/PublicLiveSideActionsBoard';

type LiveScope = 'rounds' | 'overall' | 'side_actions';

interface TournamentLiveViewerProps {
  tournamentId: number;
  tournamentName: string;
  centerName?: string | null;
}

/**
 * Public tournament live hub: pick an event, scope (rounds / overall / SA), view results.
 */
const TournamentLiveViewer: React.FC<TournamentLiveViewerProps> = ({
  tournamentId,
  tournamentName,
  centerName,
}) => {
  const { user } = useAuth();
  const roleAwareNav = useRoleAwareNavigation(user);
  const [searchParams, setSearchParams] = useSearchParams();
  const eventParam = searchParams.get('eventId');
  const scopeParam = searchParams.get('scope') as LiveScope | null;
  const parsedEventParam = eventParam ? Number(eventParam) : NaN;

  const [selectedEventId, setSelectedEventId] = useState<number | null>(
    Number.isFinite(parsedEventParam) && parsedEventParam > 0 ? parsedEventParam : null
  );
  const [liveScoresRoundId, setLiveScoresRoundId] = useState<number | null>(null);
  const [scope, setScope] = useState<LiveScope>(
    scopeParam === 'overall' || scopeParam === 'side_actions' || scopeParam === 'rounds'
      ? scopeParam
      : 'rounds'
  );

  const {
    data: events = [],
    isLoading: eventsLoading,
    isError: eventsError,
    error: eventsErr,
  } = useQuery({
    queryKey: ['tournamentEvents', tournamentId],
    queryFn: () => EventsAPI.getTournamentEvents(tournamentId),
    enabled: tournamentId > 0,
  });

  const publishedEvents = useMemo(
    () => events.filter((e) => Boolean(e.published_at)),
    [events]
  );

  useEffect(() => {
    if (selectedEventId != null) return;
    if (publishedEvents.length === 1) {
      setSelectedEventId(publishedEvents[0].id);
    }
  }, [publishedEvents, selectedEventId]);

  useEffect(() => {
    if (!Number.isFinite(parsedEventParam) || parsedEventParam <= 0) return;
    if (selectedEventId !== parsedEventParam) {
      setSelectedEventId(parsedEventParam);
    }
  }, [parsedEventParam, selectedEventId]);

  const selectEvent = (eventId: number) => {
    setSelectedEventId(eventId);
    setLiveScoresRoundId(null);
    const next = new URLSearchParams(searchParams);
    next.set('tab', 'live');
    next.set('eventId', String(eventId));
    next.set('scope', scope);
    setSearchParams(next, { replace: true });
  };

  const selectScope = (nextScope: LiveScope) => {
    setScope(nextScope);
    const next = new URLSearchParams(searchParams);
    next.set('tab', 'live');
    if (selectedEventId) next.set('eventId', String(selectedEventId));
    next.set('scope', nextScope);
    setSearchParams(next, { replace: true });
  };

  const {
    data: eventComplete,
    isLoading: eventLoading,
    isError: eventError,
    error: eventErr,
  } = useQuery({
    queryKey: ['eventComplete', selectedEventId],
    queryFn: () => EventsAPI.getCompleteEvent(selectedEventId!),
    enabled: selectedEventId != null && selectedEventId > 0,
    retry: false,
  });

  const {
    data: championship,
    isLoading: championshipLoading,
    isError: championshipError,
    error: championshipErr,
  } = useQuery({
    queryKey: ['eventChampionship', selectedEventId],
    queryFn: () => EventsAPI.getEventChampionshipResults(selectedEventId!),
    enabled: selectedEventId != null && selectedEventId > 0 && scope === 'overall',
    retry: false,
  });

  const selectedSummary = events.find((e) => e.id === selectedEventId);
  const scopeTabs: { id: LiveScope; label: string }[] = [
    { id: 'rounds', label: 'Rounds' },
    { id: 'overall', label: 'Overall' },
    { id: 'side_actions', label: 'Side Action' },
  ];

  const championshipNodes = useMemo(() => {
    if (!championship?.final_nodes?.length) return [];
    return championship.final_nodes.map((node) => ({
      id: String(node.final_node_id),
      label: node.final_node_name || `Node ${node.final_node_id}`,
      placements: node.placements ?? [],
    }));
  }, [championship]);

  return (
    <div className="space-y-4 sm:space-y-6" id="tournament-live">
      <div>
        <PageSectionHeading>Live results</PageSectionHeading>
        <p className="text-sm text-text-muted mt-1">
          Follow {tournamentName}
          {centerName ? ` at ${centerName}` : ''} as scores update. Pick an event and scope
          (rounds, overall, or side action). Money stays hidden unless you participated.
        </p>
      </div>

      {eventsLoading && <Loading />}
      {eventsError && (
        <Alert
          variant="error"
          message={getErrorMessage(eventsErr, 'Could not load tournament events.')}
        />
      )}

      {!eventsLoading && publishedEvents.length === 0 && (
        <p className="text-sm text-text-muted">
          No public events yet. Live viewing unlocks once an event is made public.
        </p>
      )}

      {publishedEvents.length > 1 && (
        <div
          className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x"
          role="list"
          aria-label="Select event"
        >
          {publishedEvents.map((ev) => {
            const active = ev.id === selectedEventId;
            return (
              <button
                key={ev.id}
                type="button"
                role="listitem"
                onClick={() => selectEvent(ev.id)}
                className={`snap-start shrink-0 min-h-11 px-4 py-2.5 text-sm rounded-md border transition-colors ${
                  active
                    ? 'border-primary bg-primary text-white'
                    : 'border-border bg-surface text-text hover:border-primary'
                }`}
              >
                {ev.name}
              </button>
            );
          })}
        </div>
      )}

      {publishedEvents.length === 1 && selectedSummary && (
        <p className="text-sm font-medium text-text">{selectedSummary.name}</p>
      )}

      {selectedEventId != null && (
        <div className="space-y-4 sm:space-y-6">
          <div
            className="sticky top-0 z-10 -mx-3 px-3 py-2 sm:mx-0 sm:px-0 sm:py-0 sm:static bg-surface/95 backdrop-blur-sm sm:bg-transparent sm:backdrop-blur-none border-b border-border sm:border-0"
            role="tablist"
            aria-label="Live scope"
          >
            <div className="flex gap-2 overflow-x-auto">
              {scopeTabs.map((tab) => {
                const active = scope === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => selectScope(tab.id)}
                    className={`shrink-0 min-h-11 px-4 py-2.5 text-sm rounded-md border transition-colors ${
                      active
                        ? 'border-primary bg-primary text-white'
                        : 'border-border bg-surface text-text hover:border-primary'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              to={`${roleAwareNav.getEventPath(selectedEventId)}`}
              className="text-sm text-primary hover:underline min-h-11 inline-flex items-center"
            >
              Open event page
            </Link>
          </div>

          {eventLoading && <Loading />}
          {eventError && (
            <Alert
              variant="error"
              message={getErrorMessage(
                eventErr,
                'This event is not available for live viewing yet.'
              )}
            />
          )}

          {eventComplete && scope === 'rounds' && (
            <div className="space-y-3">
              <h3 className="text-base font-semibold text-primary">Rounds</h3>
              <p className="text-sm text-text-muted">
                Tap a round to view live scores.
              </p>
              <PublicLiveRoundsList
                eventId={selectedEventId}
                rounds={eventComplete.rounds ?? []}
                onRoundSelect={(rid) => setLiveScoresRoundId(rid)}
              />
            </div>
          )}

          {scope === 'overall' && (
            <div className="space-y-3">
              <h3 className="text-base font-semibold text-primary">Overall standings</h3>
              {championshipLoading && <Loading />}
              {championshipError && (
                <Alert
                  variant="error"
                  message={getErrorMessage(
                    championshipErr,
                    'Overall standings are not available yet.'
                  )}
                />
              )}
              {!championshipLoading && !championshipError && championshipNodes.length === 0 && (
                <p className="text-sm text-text-muted">No overall standings published yet.</p>
              )}
              {championshipNodes.map((node) => (
                <div key={node.id} className="border border-border rounded-md p-3">
                  <p className="text-sm font-medium text-text mb-2">{node.label}</p>
                  {node.placements.length === 0 ? (
                    <p className="text-xs text-text-muted">No placements yet.</p>
                  ) : (
                    <ul className="space-y-1">
                      {node.placements.slice(0, 25).map((p) => (
                        <li key={p.id} className="text-sm text-text">
                          #{p.placement}{' '}
                          {p.standings_label || p.winner?.display_name || '—'}
                          {p.criteria_value != null ? ` · ${p.criteria_value}` : ''}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}

          {eventComplete && scope === 'side_actions' && (
            <PublicLiveSideActionsBoard
              tournamentId={tournamentId}
              eventId={selectedEventId}
            />
          )}

          <RoundLiveScoresModal
            eventId={selectedEventId}
            tournamentId={tournamentId}
            roundId={liveScoresRoundId}
            isOpen={liveScoresRoundId != null}
            onClose={() => setLiveScoresRoundId(null)}
            eventPublished={
              eventComplete?.published_at != null || selectedSummary?.published_at != null
            }
          />
        </div>
      )}

      {publishedEvents.length > 1 && selectedEventId == null && (
        <p className="text-sm text-text-muted">
          Select an event to view live scores and side action.
        </p>
      )}

      {publishedEvents.length > 0 && (
        <div className="pt-2">
          <Button
            type="button"
            size="small"
            variant="lightbackground"
            onClick={async () => {
              const base =
                (import.meta.env.VITE_PUBLIC_APP_URL || '').trim().replace(/\/+$/, '') ||
                window.location.origin;
              const url = `${base}/tournaments/${tournamentId}?tab=live${
                selectedEventId ? `&eventId=${selectedEventId}` : ''
              }&scope=${scope}`;
              try {
                await navigator.clipboard.writeText(url);
              } catch {
                /* ignore */
              }
            }}
          >
            Copy live link
          </Button>
        </div>
      )}
    </div>
  );
};

export default TournamentLiveViewer;
