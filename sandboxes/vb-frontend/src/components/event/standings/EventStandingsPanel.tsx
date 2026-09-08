import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import PageSectionHeading from '../../common/PageSectionHeading';
import Button from '../../common/Button';
import Loading from '../../common/Loading';
import Alert from '../../common/Alert';
import Card from '../../common/Card';
import { getErrorMessage } from '../../../api/apiErrors';
import {
  EventReportsAPI,
  type EventStandingsBasis,
  type EventStandingsScope,
} from '../../../api/event-reports';
import EventStandingsReportOptions, {
  type EventReportRoundOption,
  type EventReportSquadOption,
} from '../../event-reports/EventStandingsReportOptions';
import { buildEventStandingsReportDocument } from '../../event-reports/buildEventStandingsReportDocument';
import SideActionReportPreviewModal from '../../side_actions/reports/SideActionReportPreviewModal';
import type { ReportDocument } from '../../../utils/sideActionReportPrint';
import { allowIndividualTeamScoresForRounds } from '../../../utils/standingsIndividualScores';
import EventStandingsBoard from './EventStandingsBoard';
import { downloadStandingsExcel } from '../../event-reports/eventReportsExcelActions';

export interface EventStandingsPanelProps {
  eventId: number;
  tournamentId: number;
  eventName?: string | null;
  eventFormat: string;
  rounds: EventReportRoundOption[];
  squads: EventReportSquadOption[];
  /** Prefer true when the event uses handicap. */
  defaultIncludeHandicap?: boolean;
}

const EventStandingsPanel: React.FC<EventStandingsPanelProps> = ({
  eventId,
  tournamentId,
  eventName,
  eventFormat,
  rounds,
  squads,
  defaultIncludeHandicap = true,
}) => {
  const sortedRounds = useMemo(
    () =>
      [...rounds].sort(
        (a, b) => Number(a.round_number) - Number(b.round_number) || Number(a.id) - Number(b.id)
      ),
    [rounds]
  );

  const [scope, setScope] = useState<EventStandingsScope>('event');
  const [basis, setBasis] = useState<EventStandingsBasis>('final');
  const [roundNumber, setRoundNumber] = useState<number>(
    () => sortedRounds[0]?.round_number ?? 1
  );
  const [squadId, setSquadId] = useState<number | null>(() => squads[0]?.id ?? null);
  const [includePrizes, setIncludePrizes] = useState(false);
  const [includeHandicap, setIncludeHandicap] = useState(defaultIncludeHandicap);
  const [includeGameScores, setIncludeGameScores] = useState(true);
  const [showCutLine, setShowCutLine] = useState(false);
  const [showTeamNames, setShowTeamNames] = useState(true);
  const [showBowlerNames, setShowBowlerNames] = useState(true);
  const [showIndividualTeamScores, setShowIndividualTeamScores] = useState(
    () => allowIndividualTeamScoresForRounds(rounds)
  );
  const [previewDoc, setPreviewDoc] = useState<ReportDocument | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const isTeamEvent = String(eventFormat || '').toLowerCase() === 'teams';
  const allowIndividualTeamScores = useMemo(() => {
    if (!isTeamEvent) return false;
    if (basis === 'round') {
      const selected = sortedRounds.find((r) => r.round_number === roundNumber);
      return allowIndividualTeamScoresForRounds(selected ? [selected] : rounds);
    }
    return allowIndividualTeamScoresForRounds(rounds);
  }, [basis, isTeamEvent, roundNumber, rounds, sortedRounds]);

  useEffect(() => {
    if (!allowIndividualTeamScores) {
      setShowIndividualTeamScores(false);
    }
  }, [allowIndividualTeamScores]);

  useEffect(() => {
    if (sortedRounds.length && !sortedRounds.some((r) => r.round_number === roundNumber)) {
      setRoundNumber(sortedRounds[0].round_number);
    }
  }, [roundNumber, sortedRounds]);

  useEffect(() => {
    if (scope === 'squad' && squads.length && !squads.some((s) => s.id === squadId)) {
      setSquadId(squads[0].id);
    }
  }, [scope, squadId, squads]);

  const requestReady =
    tournamentId > 0 &&
    eventId > 0 &&
    (scope !== 'squad' || Boolean(squadId)) &&
    (basis !== 'round' || Boolean(roundNumber));

  const {
    data: report,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      'eventStandingsBoard',
      tournamentId,
      eventId,
      scope,
      basis,
      basis === 'round' ? roundNumber : null,
      scope === 'squad' ? squadId : null,
      includePrizes,
      includeHandicap,
      showCutLine,
    ],
    queryFn: () =>
      EventReportsAPI.getStandingsReport({
        tournament_id: tournamentId,
        event_id: eventId,
        squad_id: scope === 'squad' ? squadId : null,
        scope,
        basis,
        round_number: basis === 'round' ? roundNumber : null,
        include_prizes: includePrizes,
        include_handicap: includeHandicap,
        show_cut_line: showCutLine,
      }),
    enabled: requestReady,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const boardOptions = useMemo(
    () => ({
      showTeamNames: isTeamEvent ? showTeamNames : true,
      showBowlerNames: isTeamEvent ? showBowlerNames : true,
      includeGameScores,
      showIndividualTeamScores:
        isTeamEvent && allowIndividualTeamScores ? showIndividualTeamScores : false,
    }),
    [
      allowIndividualTeamScores,
      includeGameScores,
      isTeamEvent,
      showBowlerNames,
      showIndividualTeamScores,
      showTeamNames,
    ]
  );

  const handlePrintPreview = () => {
    if (!report) return;
    setPreviewDoc(
      buildEventStandingsReportDocument(report, {
        showTeamNames: boardOptions.showTeamNames,
        showBowlerNames: boardOptions.showBowlerNames,
        includeGameScores: boardOptions.includeGameScores,
        showIndividualTeamScores: boardOptions.showIndividualTeamScores,
      })
    );
  };

  const handleExportExcel = async () => {
    if (!report) return;
    setExportError(null);
    try {
      await downloadStandingsExcel(report, boardOptions);
    } catch (err) {
      setExportError(getErrorMessage(err, 'Failed to export standings.'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <PageSectionHeading>Standings</PageSectionHeading>
          <p className="text-sm text-text-muted mt-1">
            Current place board for {eventName || 'this event'} — same ranking engine as the
            Standings report. Adjust scope and options below; export Excel or print a hard copy.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button
            type="button"
            variant="lightbackground"
            size="small"
            disabled={isFetching}
            onClick={() => void refetch()}
          >
            {isFetching ? 'Refreshing…' : 'Refresh'}
          </Button>
          <Button
            type="button"
            variant="lightbackground"
            size="small"
            disabled={!report || isLoading}
            onClick={() => void handleExportExcel()}
          >
            Export Excel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="small"
            disabled={!report || isLoading}
            onClick={handlePrintPreview}
          >
            Print preview
          </Button>
        </div>
      </div>

      <Card>
        <EventStandingsReportOptions
          tournamentOnly={false}
          hideTournamentScope
          showFooter={false}
          scope={scope}
          onScopeChange={setScope}
          basis={basis}
          onBasisChange={setBasis}
          roundNumber={roundNumber}
          onRoundNumberChange={setRoundNumber}
          sortedRounds={sortedRounds}
          squadId={squadId}
          onSquadIdChange={setSquadId}
          squads={squads}
          includePrizes={includePrizes}
          onIncludePrizesChange={setIncludePrizes}
          includeHandicap={includeHandicap}
          onIncludeHandicapChange={setIncludeHandicap}
          includeGameScores={includeGameScores}
          onIncludeGameScoresChange={setIncludeGameScores}
          showCutLine={showCutLine}
          onShowCutLineChange={setShowCutLine}
          showTeamNameOptions={isTeamEvent}
          allowIndividualTeamScores={allowIndividualTeamScores}
          showIndividualTeamScores={showIndividualTeamScores}
          onShowIndividualTeamScoresChange={setShowIndividualTeamScores}
          showTeamNames={showTeamNames}
          onShowTeamNamesChange={setShowTeamNames}
          showBowlerNames={showBowlerNames}
          onShowBowlerNamesChange={setShowBowlerNames}
          busy={isFetching}
        />
      </Card>

      {exportError && (
        <Alert
          variant="error"
          message={exportError}
          onDismiss={() => setExportError(null)}
        />
      )}

      {isLoading && (
        <div className="flex justify-center py-12">
          <Loading size="medium" />
        </div>
      )}

      {!isLoading && isError && (
        <Alert
          variant="error"
          message={getErrorMessage(error, 'Could not load standings.')}
        />
      )}

      {!isLoading && !isError && report && (
        <EventStandingsBoard report={report} options={boardOptions} />
      )}

      <SideActionReportPreviewModal
        isOpen={previewDoc != null}
        onClose={() => setPreviewDoc(null)}
        document={previewDoc}
      />
    </div>
  );
};

export default EventStandingsPanel;
