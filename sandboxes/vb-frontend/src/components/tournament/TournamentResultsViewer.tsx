import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { EventsAPI } from '../../api/events';
import { getErrorMessage } from '../../api/apiErrors';
import { getMostRelevantRound, isRoundIdValid } from '../../features/rounds/roundRelevance';
import { useRoundRealtimeStatuses } from '../../hooks/useRoundRealtimeStatuses';
import Alert from '../common/Alert';
import Loading from '../common/Loading';
import PageSectionHeading from '../common/PageSectionHeading';
import RoundLiveScoresModal from '../event/basicinfo/RoundLiveScoresModal';
import PublicLiveSideActionsBoard from '../side_actions/PublicLiveSideActionsBoard';

type ResultsScope = 'standings' | 'side_actions';

interface TournamentResultsViewerProps {
  tournamentId: number;
  tournamentName: string;
  centerName?: string | null;
}

/**
 * Bowler-facing Results hub: standings (scores by event/round) + side actions.
 * No event-flow diagram.
 */
const TournamentResultsViewer: React.FC<TournamentResultsViewerProps> = ({
  tournamentId,
  tournamentName,
  centerName,
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const eventParam = searchParams.get('eventId');
  const scopeParam = searchParams.get('scope');
  const roundParam = searchParams.get('roundId');
  const parsedEventParam = eventParam ? Number(eventParam) : NaN;
  const parsedRoundParam = roundParam ? Number(roundParam) : NaN;

  const initialScope: ResultsScope =
    scopeParam === 'side_actions' || scopeParam === 'side-actions'
      ? 'side_actions'
      : 'standings';

  const [selectedEventId, setSelectedEventId] = useState<number | null>(
    Number.isFinite(parsedEventParam) && parsedEventParam > 0 ? parsedEventParam : null
  );
  const [selectedRoundId, setSelectedRoundId] = useState<number | null>(
    Number.isFinite(parsedRoundParam) && parsedRoundParam > 0 ? parsedRoundParam : null
  );
  const [scope, setScope] = useState<ResultsScope>(initialScope);
  const [didAutoPickRound, setDidAutoPickRound] = useState(false);

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

  useEffect(() => {
    if (scopeParam === 'side_actions' || scopeParam === 'side-actions') {
      setScope('side_actions');
    } else if (
      scopeParam === 'standings' ||
      scopeParam === 'rounds' ||
      scopeParam === 'overall' ||
      !scopeParam
    ) {
      setScope('standings');
    }
  }, [scopeParam]);

  const writeParams = (opts: {
    eventId?: number | null;
    scope?: ResultsScope;
    roundId?: number | null;
  }) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', 'results');
    const eid = opts.eventId !== undefined ? opts.eventId : selectedEventId;
    const sc = opts.scope ?? scope;
    const rid = opts.roundId !== undefined ? opts.roundId : selectedRoundId;
    if (eid) next.set('eventId', String(eid));
    else next.delete('eventId');
    next.set('scope', sc);
    if (sc === 'standings' && rid) next.set('roundId', String(rid));
    else next.delete('roundId');
    // Drop legacy live-only params noise
    if (searchParams.get('view') === 'bowler') next.set('view', 'bowler');
    setSearchParams(next, { replace: true });
  };

  const selectEvent = (eventId: number) => {
    setSelectedEventId(eventId);
    setSelectedRoundId(null);
    setDidAutoPickRound(false);
    writeParams({ eventId, roundId: null });
  };

  const selectScope = (nextScope: ResultsScope) => {
    setScope(nextScope);
    writeParams({ scope: nextScope });
  };

  const selectRound = (roundId: number) => {
    setSelectedRoundId(roundId);
    writeParams({ roundId });
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

  const rounds = eventComplete?.rounds ?? [];
  const allSquads = useMemo(
    () => rounds.flatMap((r) => r.squads ?? []),
    [rounds]
  );

  const { data: roundStatusData } = useRoundRealtimeStatuses(
    selectedEventId ?? undefined,
    rounds
  );

  useEffect(() => {
    if (scope !== 'standings') return;
    if (!rounds.length) return;

    if (
      Number.isFinite(parsedRoundParam) &&
      parsedRoundParam > 0 &&
      isRoundIdValid(parsedRoundParam, rounds)
    ) {
      if (selectedRoundId !== parsedRoundParam) {
        setSelectedRoundId(parsedRoundParam);
      }
      if (!didAutoPickRound) setDidAutoPickRound(true);
      return;
    }

    if (didAutoPickRound && isRoundIdValid(selectedRoundId, rounds)) return;

    const relevant = getMostRelevantRound({
      rounds,
      allSquads,
      roundStatusData,
    });
    const nextId =
      relevant.roundId ??
      (rounds.length
        ? [...rounds].sort((a, b) => a.round_number - b.round_number)[0].id
        : null);
    if (nextId == null) {
      setDidAutoPickRound(true);
      return;
    }
    setSelectedRoundId(nextId);
    setDidAutoPickRound(true);
    const next = new URLSearchParams(searchParams);
    next.set('tab', 'results');
    if (selectedEventId) next.set('eventId', String(selectedEventId));
    next.set('scope', 'standings');
    next.set('roundId', String(nextId));
    if (searchParams.get('view') === 'bowler') next.set('view', 'bowler');
    setSearchParams(next, { replace: true });
  }, [
    scope,
    rounds,
    allSquads,
    roundStatusData,
    parsedRoundParam,
    didAutoPickRound,
    selectedRoundId,
    selectedEventId,
    searchParams,
    setSearchParams,
  ]);

  const selectedSummary = events.find((e) => e.id === selectedEventId);
  const scopeTabs: { id: ResultsScope; label: string }[] = [
    { id: 'standings', label: 'Standings' },
    { id: 'side_actions', label: 'Side Action' },
  ];

  const orderedRounds = useMemo(
    () => [...rounds].sort((a, b) => a.round_number - b.round_number),
    [rounds]
  );

  return (
    <div className="space-y-4 sm:space-y-6" id="tournament-results">
      <div>
        <PageSectionHeading>Results</PageSectionHeading>
        <p className="text-sm text-text-muted mt-1">
          Scores and side-action results for {tournamentName}
          {centerName ? ` at ${centerName}` : ''}. Money stays hidden unless you participated.
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
          No public events yet. Results unlock once an event is made public.
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
            aria-label="Results section"
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

          {eventLoading && <Loading />}
          {eventError && (
            <Alert
              variant="error"
              message={getErrorMessage(
                eventErr,
                'This event is not available for results viewing yet.'
              )}
            />
          )}

          {eventComplete && scope === 'standings' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <label htmlFor="results-round" className="text-sm font-medium text-text shrink-0">
                  Round
                </label>
                <select
                  id="results-round"
                  className="min-h-11 w-full sm:max-w-md rounded-md border border-border bg-surface text-text px-3 text-sm"
                  value={selectedRoundId ?? ''}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    if (Number.isFinite(id) && id > 0) selectRound(id);
                  }}
                >
                  {orderedRounds.length === 0 && (
                    <option value="">No rounds yet</option>
                  )}
                  {orderedRounds.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.friendly_name?.trim() || `Round ${r.round_number}`}
                    </option>
                  ))}
                </select>
              </div>

              {selectedRoundId != null ? (
                <RoundLiveScoresModal
                  eventId={selectedEventId}
                  tournamentId={tournamentId}
                  roundId={selectedRoundId}
                  isOpen
                  onClose={() => {}}
                  embedded
                  useHandicapScoring={(eventComplete.handicap_percentage ?? 0) > 0}
                  eventPublished={
                    eventComplete.published_at != null || selectedSummary?.published_at != null
                  }
                />
              ) : (
                <p className="text-sm text-text-muted">Select a round to view scores.</p>
              )}
            </div>
          )}

          {eventComplete && scope === 'side_actions' && (
            <PublicLiveSideActionsBoard
              tournamentId={tournamentId}
              eventId={selectedEventId}
            />
          )}
        </div>
      )}

      {publishedEvents.length > 1 && selectedEventId == null && (
        <p className="text-sm text-text-muted">Select an event to view standings and side action.</p>
      )}
    </div>
  );
};

export default TournamentResultsViewer;
