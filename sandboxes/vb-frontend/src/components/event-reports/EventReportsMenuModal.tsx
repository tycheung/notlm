import React, { useEffect, useMemo, useState } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Alert from '../common/Alert';
import SideActionReportPreviewModal from '../side_actions/reports/SideActionReportPreviewModal';
import {
  EventReportsAPI,
  type EventRosterScope,
  type EventStandingsBasis,
  type EventStandingsScope,
  type PrizeFundScope,
  type ScoreSheetLayout,
} from '../../api/event-reports';
import { EventsAPI } from '../../api/events';
import { getErrorMessage } from '../../api/apiErrors';
import type { ReportDocument } from '../../utils/sideActionReportPrint';
import { buildEventStandingsReportDocument } from './buildEventStandingsReportDocument';
import { buildEventRosterReportDocument } from './buildEventRosterReportDocument';
import { buildEventFinancialsReportDocument } from './buildEventFinancialsReportDocument';
import { buildSideActionFinancialsReportDocument } from './buildSideActionFinancialsReportDocument';
import { buildPrizeFundReportDocument } from './buildPrizeFundReportDocument';
import { buildScoreSheetsReportDocument } from './buildScoreSheetsReportDocument';
import { buildLaneAssignmentSheetsReportDocument } from './buildLaneAssignmentSheetsReportDocument';
import EventStandingsReportOptions, {
  type EventReportRoundOption,
  type EventReportSquadOption,
} from './EventStandingsReportOptions';
import EventRosterReportOptions from './EventRosterReportOptions';
import SingleGameReportOptions from './SingleGameReportOptions';
import PrizeFundReportOptions from './PrizeFundReportOptions';
import ScoreSheetsReportOptions from './ScoreSheetsReportOptions';
import LaneAssignmentSheetsReportOptions from './LaneAssignmentSheetsReportOptions';
import { allowIndividualTeamScoresForRounds } from '../../utils/standingsIndividualScores';
import type { RoundRead } from '../../types/round';
import { downloadScoresExcel, downloadStandingsExcel } from './eventReportsExcelActions';
import { TournamentsAPI } from '../../api/tournaments';
import { RoundMatchSeriesAPI } from '../../api/round-match-series';
import { RoundsAPI } from '../../api/rounds';
import { TeamsAPI } from '../../api/teams';
import {
  buildLanePairConflictsReportDocument,
  filterLaneConflictsForEvent,
} from './buildLanePairConflictsReportDocument';
import {
  buildEventStepladderReportDocument,
  isStepladderCompetitionMethod,
} from './buildEventStepladderReportDocument';

export type { EventReportRoundOption, EventReportSquadOption };

interface EventReportsMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournamentId: number;
  tournamentName?: string | null;
  /** When set, enables event/squad scopes. Omit for tournament-level entry. */
  eventId?: number | null;
  eventName?: string | null;
  eventFormat?: string | null;
  rounds?: EventReportRoundOption[];
  squads?: EventReportSquadOption[];
  defaultScope?: EventStandingsScope;
  isSaOnly?: boolean;
}

type Step =
  | 'menu'
  | 'standings'
  | 'roster'
  | 'singleGame'
  | 'prizeFund'
  | 'scoreSheets'
  | 'laneAssignments'
  | 'stepladder';

const EventReportsMenuModal: React.FC<EventReportsMenuModalProps> = ({
  isOpen,
  onClose,
  tournamentId,
  tournamentName,
  eventId = null,
  eventName = null,
  eventFormat = null,
  rounds = [],
  squads = [],
  defaultScope,
  isSaOnly = false,
}) => {
  const tournamentOnly = eventId == null;
  const initialScope: EventStandingsScope =
    defaultScope ?? (tournamentOnly ? 'tournament' : 'event');

  const isTeamEvent = String(eventFormat || '').toLowerCase() === 'teams';

  const [step, setStep] = useState<Step>('menu');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<ReportDocument | null>(null);

  const [scope, setScope] = useState<EventStandingsScope>(initialScope);
  const [basis, setBasis] = useState<EventStandingsBasis>('final');
  const [roundNumber, setRoundNumber] = useState<number>(
    rounds[0]?.round_number ?? 1
  );
  const [squadId, setSquadId] = useState<number | null>(squads[0]?.id ?? null);
  const [includePrizes, setIncludePrizes] = useState(true);
  const [includeHandicap, setIncludeHandicap] = useState(true);
  const [includeGameScores, setIncludeGameScores] = useState(true);
  const [showCutLine, setShowCutLine] = useState(false);
  const [gameNumber, setGameNumber] = useState(1);
  const [rosterScope, setRosterScope] = useState<EventRosterScope>('event');
  const [includeCheckin, setIncludeCheckin] = useState(true);
  const [includeUsbc, setIncludeUsbc] = useState(true);
  const [includeAverage, setIncludeAverage] = useState(true);
  const [includeRosterHandicap, setIncludeRosterHandicap] = useState(true);
  const [includeLane, setIncludeLane] = useState(true);
  const [includePaid, setIncludePaid] = useState(true);
  const [showIndividualTeamScores, setShowIndividualTeamScores] = useState(() =>
    allowIndividualTeamScoresForRounds(rounds)
  );
  const [showTeamNames, setShowTeamNames] = useState(true);
  const [showBowlerNames, setShowBowlerNames] = useState(true);
  const [prizeFundScope, setPrizeFundScope] = useState<PrizeFundScope>(
    tournamentOnly ? 'tournament' : 'event'
  );
  const [includeFundSummary, setIncludeFundSummary] = useState(true);
  const [includeWinners, setIncludeWinners] = useState(true);
  const [scoreSheetLayout, setScoreSheetLayout] = useState<ScoreSheetLayout>(
    isTeamEvent ? 'team' : 'bowler'
  );
  const [scoreSheetSquadId, setScoreSheetSquadId] = useState<number | null>(null);
  const [laneAssignSquadId, setLaneAssignSquadId] = useState<number | null>(null);
  const [includeIndividualHandicap, setIncludeIndividualHandicap] = useState(true);
  const [includeTeamHandicap, setIncludeTeamHandicap] = useState(true);
  const [stepladderRoundId, setStepladderRoundId] = useState<number | null>(null);
  const [tournamentRoundOptions, setTournamentRoundOptions] = useState<
    EventReportRoundOption[]
  >([]);
  const [tournamentRoundsLoadFailed, setTournamentRoundsLoadFailed] = useState(false);
  const [hasTeamEvents, setHasTeamEvents] = useState(false);
  const [tournamentGameStyleRounds, setTournamentGameStyleRounds] = useState<
    EventReportRoundOption[]
  >([]);

  useEffect(() => {
    if (!isOpen) return;
    setStep('menu');
    setError(null);
    setPreviewDoc(null);
    setBusy(false);
    setScope(initialScope);
    setBasis('final');
    setRoundNumber(rounds[0]?.round_number ?? 1);
    setSquadId(squads[0]?.id ?? null);
    setIncludePrizes(false);
    setIncludeHandicap(true);
    setIncludeGameScores(true);
    setShowCutLine(false);
    setGameNumber(1);
    setRosterScope('event');
    setIncludeCheckin(true);
    setIncludeUsbc(true);
    setIncludeAverage(true);
    setIncludeRosterHandicap(true);
    setIncludeLane(true);
    setIncludePaid(true);
    setShowIndividualTeamScores(allowIndividualTeamScoresForRounds(rounds));
    setShowTeamNames(true);
    setShowBowlerNames(true);
    setPrizeFundScope(tournamentOnly ? 'tournament' : 'event');
    setIncludeFundSummary(true);
    setIncludeWinners(true);
    setScoreSheetLayout(isTeamEvent ? 'team' : 'bowler');
    setScoreSheetSquadId(null);
    setLaneAssignSquadId(null);
    setIncludeIndividualHandicap(true);
    setIncludeTeamHandicap(true);
    setStepladderRoundId(null);
    setTournamentRoundsLoadFailed(false);
    setTournamentGameStyleRounds([]);
    // rounds/squads read when opening; omit from deps (parents often pass fresh arrays).
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open/context only
  }, [isOpen, initialScope, eventId, tournamentId]);

  useEffect(() => {
    if (!isOpen) return;
    // Need tournament event list for tournament-only entry; need round styles when
    // tournament scope can be selected (tournament entry or team event).
    if (!tournamentOnly && !isTeamEvent) return;
    let cancelled = false;
    (async () => {
      try {
        const events = await EventsAPI.getTournamentEvents(tournamentId);
        if (cancelled) return;
        const maxRounds = Math.max(
          0,
          ...events.map((e) => Number(e.number_of_rounds || 0))
        );
        setHasTeamEvents(
          events.some((e) => String(e.event_format || '').toLowerCase() === 'teams')
        );
        if (tournamentOnly) {
          setTournamentRoundOptions(
            Array.from({ length: maxRounds }, (_, i) => ({
              id: i + 1,
              round_number: i + 1,
            }))
          );
          setTournamentRoundsLoadFailed(false);
          if (maxRounds > 0) {
            setRoundNumber((prev) => (prev > 0 && prev <= maxRounds ? prev : 1));
          }
        }

        const withRounds = await Promise.all(
          events.map(async (event) => {
            try {
              return await EventsAPI.getEventWithRounds(Number(event.id));
            } catch {
              return null;
            }
          })
        );
        if (cancelled) return;
        const styleRounds: EventReportRoundOption[] = [];
        for (const event of withRounds) {
          for (const round of (event?.rounds || []) as RoundRead[]) {
            styleRounds.push({
              id: Number(round.id),
              round_number: Number(round.round_number || 0),
              friendly_name: round.friendly_name,
              game_count: Number(round.game_count || 0) || null,
              competition_method: round.competition_method ?? null,
              competition_method_config:
                (round.competition_method_config as Record<string, unknown> | null) ??
                null,
              eventId: Number(event.id),
              eventName: event.name,
              eventFormat: event.event_format ?? null,
            });
          }
        }
        setTournamentGameStyleRounds(styleRounds);
      } catch (err) {
        if (!cancelled) {
          if (tournamentOnly) {
            setTournamentRoundOptions([]);
            setHasTeamEvents(false);
            setTournamentRoundsLoadFailed(true);
            setError(
              getErrorMessage(err, 'Could not load tournament events for round list.')
            );
          }
          setTournamentGameStyleRounds([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, tournamentOnly, tournamentId, isTeamEvent]);

  const sortedRounds = useMemo(() => {
    const source = tournamentOnly ? tournamentRoundOptions : rounds;
    return [...source].sort((a, b) => a.round_number - b.round_number);
  }, [tournamentOnly, tournamentRoundOptions, rounds]);

  const stepladderRounds = useMemo(() => {
    const source = tournamentOnly ? tournamentGameStyleRounds : rounds;
    return source.filter((round) =>
      isStepladderCompetitionMethod(round.competition_method)
    );
  }, [tournamentOnly, tournamentGameStyleRounds, rounds]);

  const maxGamesForSelectedRound = useMemo(() => {
    if (tournamentOnly || scope === 'tournament') {
      const matches = tournamentGameStyleRounds.filter(
        (r) => r.round_number === roundNumber
      );
      const max = Math.max(
        0,
        ...matches.map((r) => Number(r.game_count || 0)),
        ...sortedRounds
          .filter((r) => r.round_number === roundNumber)
          .map((r) => Number(r.game_count || 0))
      );
      return max > 0 ? max : 3;
    }
    const selected = sortedRounds.find((r) => r.round_number === roundNumber);
    const n = Number(selected?.game_count || 0);
    return n > 0 ? n : 3;
  }, [
    tournamentOnly,
    scope,
    roundNumber,
    tournamentGameStyleRounds,
    sortedRounds,
  ]);

  useEffect(() => {
    if (gameNumber > maxGamesForSelectedRound) {
      setGameNumber(1);
    }
  }, [gameNumber, maxGamesForSelectedRound]);

  const showTeamNameOptions = tournamentOnly ? hasTeamEvents : isTeamEvent;

  const allowIndividualTeamScores = useMemo(() => {
    if (!showTeamNameOptions) return false;
    const useTournamentRounds = tournamentOnly || scope === 'tournament';
    if (useTournamentRounds) {
      if (tournamentGameStyleRounds.length > 0) {
        return allowIndividualTeamScoresForRounds(tournamentGameStyleRounds);
      }
      // Loading / failed: fall back to known event rounds when present.
      if (rounds.length > 0) {
        return allowIndividualTeamScoresForRounds(rounds);
      }
      return false;
    }
    return allowIndividualTeamScoresForRounds(rounds);
  }, [
    showTeamNameOptions,
    tournamentOnly,
    scope,
    tournamentGameStyleRounds,
    rounds,
  ]);

  useEffect(() => {
    if (!allowIndividualTeamScores) {
      setShowIndividualTeamScores(false);
    }
  }, [allowIndividualTeamScores]);

  const contextLabel = tournamentOnly
    ? tournamentName || 'this tournament'
    : eventName || 'this event';
  const menuTitle = tournamentOnly ? 'Tournament Reports' : 'Event Reports';

  const resetAndClose = () => {
    setStep('menu');
    setError(null);
    setPreviewDoc(null);
    setBusy(false);
    onClose();
  };

  const runStandings = async () => {
    setBusy(true);
    setError(null);
    try {
      if (scope === 'squad' && !squadId) {
        setError('Select a squad for squad-scoped standings.');
        return;
      }
      if (scope !== 'tournament' && !eventId) {
        setError('Event context is required for this scope.');
        return;
      }
      if (basis === 'round' && !roundNumber) {
        setError('Select a round number.');
        return;
      }
      const report = await EventReportsAPI.getStandingsReport({
        tournament_id: tournamentId,
        event_id: scope === 'tournament' ? null : eventId,
        squad_id: scope === 'squad' ? squadId : null,
        scope,
        basis,
        round_number: basis === 'round' ? roundNumber : null,
        include_prizes: includePrizes,
        include_handicap: includeHandicap,
        show_cut_line: showCutLine,
      });
      setPreviewDoc(
        buildEventStandingsReportDocument(report, {
          showTeamNames: showTeamNameOptions ? showTeamNames : true,
          showBowlerNames: showTeamNameOptions ? showBowlerNames : true,
          includeGameScores,
          showIndividualTeamScores:
            showTeamNameOptions && allowIndividualTeamScores
              ? showIndividualTeamScores
              : false,
        })
      );
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to build standings report.'));
    } finally {
      setBusy(false);
    }
  };

  const standingsExcelOptions = () => ({
    showTeamNames: showTeamNameOptions ? showTeamNames : true,
    showBowlerNames: showTeamNameOptions ? showBowlerNames : true,
    includeGameScores,
    showIndividualTeamScores:
      showTeamNameOptions && allowIndividualTeamScores
        ? showIndividualTeamScores
        : false,
  });

  const runStandingsExcel = async (quickDefaults: boolean) => {
    setBusy(true);
    setError(null);
    try {
      const excelScope: EventStandingsScope = quickDefaults
        ? tournamentOnly
          ? 'tournament'
          : 'event'
        : scope;
      const excelBasis: EventStandingsBasis = quickDefaults ? 'final' : basis;
      if (excelScope === 'squad' && !squadId) {
        setError('Select a squad for squad-scoped standings.');
        return;
      }
      if (excelScope !== 'tournament' && !eventId) {
        setError('Event context is required for this scope.');
        return;
      }
      if (excelBasis === 'round' && !roundNumber) {
        setError('Select a round number.');
        return;
      }
      const report = await EventReportsAPI.getStandingsReport({
        tournament_id: tournamentId,
        event_id: excelScope === 'tournament' ? null : eventId,
        squad_id: excelScope === 'squad' ? squadId : null,
        scope: excelScope,
        basis: excelBasis,
        round_number: excelBasis === 'round' ? roundNumber : null,
        include_prizes: quickDefaults ? true : includePrizes,
        include_handicap: includeHandicap,
        show_cut_line: quickDefaults ? false : showCutLine,
      });
      await downloadStandingsExcel(report, standingsExcelOptions());
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to export standings.'));
    } finally {
      setBusy(false);
    }
  };

  const runScoresExcel = async () => {
    setBusy(true);
    setError(null);
    try {
      const excelScope: EventStandingsScope = tournamentOnly ? 'tournament' : 'event';
      if (excelScope !== 'tournament' && !eventId) {
        setError('Event context is required for this export.');
        return;
      }
      await downloadScoresExcel(
        {
          tournament_id: tournamentId,
          event_id: excelScope === 'tournament' ? null : eventId,
          squad_id: null,
          scope: excelScope,
        },
        [tournamentName, eventName]
      );
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to export scores.'));
    } finally {
      setBusy(false);
    }
  };

  const runRoster = async () => {
    setBusy(true);
    setError(null);
    try {
      if (!eventId) {
        setError('Event context is required for the roster.');
        return;
      }
      if (rosterScope === 'squad' && !squadId) {
        setError('Select a squad for squad-scoped roster.');
        return;
      }
      const report = await EventReportsAPI.getRosterReport({
        tournament_id: tournamentId,
        event_id: eventId,
        squad_id: rosterScope === 'squad' ? squadId : null,
        scope: rosterScope,
        include_checkin: includeCheckin,
        include_usbc: includeUsbc,
        include_average: includeAverage,
        include_handicap: includeRosterHandicap,
        include_lane: includeLane,
        include_paid: includePaid,
      });
      setPreviewDoc(buildEventRosterReportDocument(report));
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to build roster report.'));
    } finally {
      setBusy(false);
    }
  };

  const runFinancials = async () => {
    setBusy(true);
    setError(null);
    try {
      if (!eventId) {
        setError('Event context is required for event financials.');
        return;
      }
      const report = await EventReportsAPI.getFinancialsReport({
        tournament_id: tournamentId,
        event_id: eventId,
      });
      setPreviewDoc(buildEventFinancialsReportDocument(report));
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to build event financials report.'));
    } finally {
      setBusy(false);
    }
  };

  const runSideActionFinancials = async () => {
    setBusy(true);
    setError(null);
    try {
      if (!tournamentOnly && !eventId) {
        setError('Event context is required for event-scoped side action financials.');
        return;
      }
      const report = await EventReportsAPI.getSideActionFinancialsReport({
        tournament_id: tournamentId,
        event_id: tournamentOnly ? null : eventId,
        scope: tournamentOnly ? 'tournament' : 'event',
      });
      setPreviewDoc(buildSideActionFinancialsReportDocument(report));
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to build side action financials report.'));
    } finally {
      setBusy(false);
    }
  };

  const runSingleGame = async () => {
    setBusy(true);
    setError(null);
    try {
      if (scope === 'squad' && !squadId) {
        setError('Select a squad for squad-scoped game results.');
        return;
      }
      if (scope !== 'tournament' && !eventId) {
        setError('Event context is required for this scope.');
        return;
      }
      if (!roundNumber || !gameNumber) {
        setError('Select a round and game.');
        return;
      }
      const report = await EventReportsAPI.getSingleGameResultsReport({
        tournament_id: tournamentId,
        event_id: scope === 'tournament' ? null : eventId,
        squad_id: scope === 'squad' ? squadId : null,
        scope,
        round_number: roundNumber,
        game_number: gameNumber,
        include_handicap: includeHandicap,
      });
      setPreviewDoc(
        buildEventStandingsReportDocument(report, {
          showTeamNames: showTeamNameOptions ? showTeamNames : true,
          showBowlerNames: showTeamNameOptions ? showBowlerNames : true,
          includeGameScores: false,
          showIndividualTeamScores:
            showTeamNameOptions && allowIndividualTeamScores
              ? showIndividualTeamScores
              : false,
        })
      );
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to build single game results.'));
    } finally {
      setBusy(false);
    }
  };

  const runPrizeFund = async () => {
    setBusy(true);
    setError(null);
    try {
      const scope: PrizeFundScope = tournamentOnly ? 'tournament' : prizeFundScope;
      if (scope === 'event' && !eventId) {
        setError('Event context is required for event-scoped prize fund.');
        return;
      }
      const report = await EventReportsAPI.getPrizeFundReport({
        tournament_id: tournamentId,
        event_id: scope === 'tournament' ? null : eventId,
        scope,
        include_fund_summary: includeFundSummary,
        include_winners: includeWinners,
      });
      setPreviewDoc(buildPrizeFundReportDocument(report));
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to build prize fund report.'));
    } finally {
      setBusy(false);
    }
  };

  const runScoreSheets = async () => {
    setBusy(true);
    setError(null);
    try {
      if (!eventId) {
        setError('Event context is required for score sheets.');
        return;
      }
      if (!roundNumber) {
        setError('Select a round.');
        return;
      }
      const report = await EventReportsAPI.getScoreSheetsReport({
        tournament_id: tournamentId,
        event_id: eventId,
        round_number: roundNumber,
        layout: scoreSheetLayout,
        squad_id: scoreSheetSquadId,
        include_individual_handicap: includeIndividualHandicap,
        include_team_handicap: includeTeamHandicap,
      });
      setPreviewDoc(buildScoreSheetsReportDocument(report));
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to build score sheets.'));
    } finally {
      setBusy(false);
    }
  };

  const runLaneAssignments = async () => {
    setBusy(true);
    setError(null);
    try {
      if (!eventId) {
        setError('Event context is required for lane assignment sheets.');
        return;
      }
      if (!roundNumber) {
        setError('Select a round.');
        return;
      }
      const report = await EventReportsAPI.getLaneAssignmentSheetsReport({
        tournament_id: tournamentId,
        event_id: eventId,
        round_number: roundNumber,
        squad_id: laneAssignSquadId,
      });
      setPreviewDoc(buildLaneAssignmentSheetsReportDocument(report));
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to build lane assignment sheets.'));
    } finally {
      setBusy(false);
    }
  };

  const runLaneConflicts = async () => {
    setBusy(true);
    setError(null);
    try {
      const raw = await TournamentsAPI.getLaneConflicts(tournamentId);
      const report = filterLaneConflictsForEvent(raw, tournamentOnly ? null : eventId);
      setPreviewDoc(
        buildLanePairConflictsReportDocument({
          report,
          tournamentName: tournamentName || 'Tournament',
          eventName: tournamentOnly ? null : eventName,
        })
      );
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to build lane pair conflicts.'));
    } finally {
      setBusy(false);
    }
  };

  const runStepladder = async (roundIdOverride?: number) => {
    const chosenId = roundIdOverride ?? stepladderRoundId ?? stepladderRounds[0]?.id;
    const meta = stepladderRounds.find((round) => round.id === chosenId);
    if (!chosenId || !meta) {
      setError('Select a stepladder round.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const listed = await RoundMatchSeriesAPI.list(chosenId);
      const roundEventId = meta.eventId ?? eventId;
      const teamEvent =
        String(meta.eventFormat || eventFormat || '').toLowerCase() === 'teams';
      let teams = undefined;
      let participants = undefined;
      if (roundEventId && teamEvent) {
        teams = await TeamsAPI.getEventTeams(roundEventId);
      } else {
        participants = await RoundsAPI.getRoundParticipants(chosenId);
      }
      setPreviewDoc(
        buildEventStepladderReportDocument({
          matchSeries: listed.match_series || [],
          isTeamEvent: teamEvent,
          teams,
          participants,
          tournamentName,
          eventName: meta.eventName || eventName,
          roundName: meta.friendly_name || `Round ${meta.round_number}`,
        })
      );
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to build stepladder diagram.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen && !previewDoc}
        onClose={resetAndClose}
        title={
          step === 'menu'
            ? menuTitle
            : step === 'roster'
              ? 'Roster options'
              : step === 'singleGame'
                ? 'Single game options'
                : step === 'prizeFund'
                  ? 'Prize fund options'
                  : step === 'scoreSheets'
                    ? 'Score sheet options'
                    : step === 'laneAssignments'
                      ? 'Lane assignment options'
                      : step === 'stepladder'
                        ? 'Stepladder options'
                      : 'Standings options'
        }
        size="large"
        closeOnOutsideClick={false}
      >
        <div className="space-y-4">
          {error && (
            <Alert variant="error" message={error} onDismiss={() => setError(null)} />
          )}

          {step === 'menu' && (
            <div className="space-y-3">
              <p className="text-sm text-text-muted">
                Printable tournament / event competition reports for {contextLabel}.
                Preview opens in-app, then Print → Save as PDF. Excel downloads open as
                a spreadsheet you can sort, store, or edit.
              </p>
              {isSaOnly && (
                <Alert
                  variant="info"
                  message="Competition reports are locked on side action only events. Event Roster and Side Action Financials stay available. Upgrade to a full tournament to unlock the rest."
                />
              )}
              <ul className="space-y-2">
                <li className="rounded border border-border bg-surface-light px-3 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-text">Excel — Standings</p>
                    <p className="text-xs text-text-muted mt-1">
                      Current or final standings (place, pinfall, handicap, games) as a
                      spreadsheet.
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    size="small"
                    disabled={busy || isSaOnly}
                    onClick={() => void runStandingsExcel(true)}
                  >
                    Download
                  </Button>
                </li>
                <li className="rounded border border-border bg-surface-light px-3 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-text">Excel — Scores</p>
                    <p className="text-xs text-text-muted mt-1">
                      Every entered score across all rounds — one row per game.
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    size="small"
                    disabled={busy || isSaOnly}
                    onClick={() => void runScoresExcel()}
                  >
                    Download
                  </Button>
                </li>
                <li className="rounded border border-border bg-surface-light px-3 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-text">Standings</p>
                    <p className="text-xs text-text-muted mt-1">
                      Ranked standings with optional game scores, handicap, prizes, and cut/cash line.
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    size="small"
                    disabled={busy || isSaOnly}
                    onClick={() => setStep('standings')}
                  >
                    Configure
                  </Button>
                </li>
                <li className="rounded border border-border bg-surface-light px-3 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-text">Single Game Results</p>
                    <p className="text-xs text-text-muted mt-1">
                      Ranked sheet for one exact game — same layout as standings.
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    size="small"
                    disabled={busy || isSaOnly}
                    onClick={() => setStep('singleGame')}
                  >
                    Configure
                  </Button>
                </li>
                <li className="rounded border border-border bg-surface-light px-3 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-text">Prize Fund</p>
                    <p className="text-xs text-text-muted mt-1">
                      Configured place amounts. Winners only when championship placements
                      exist.
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    size="small"
                    disabled={busy || isSaOnly}
                    onClick={() => setStep('prizeFund')}
                  >
                    Configure
                  </Button>
                </li>
                {!tournamentOnly && (
                  <li className="rounded border border-border bg-surface-light px-3 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-text">Score Sheets</p>
                      <p className="text-xs text-text-muted mt-1">
                        Desk entry blanks for all games in a round — traditional grid, or
                        vertical round-robin match cards.
                      </p>
                    </div>
                    <Button
                      variant="primary"
                      size="small"
                      disabled={busy || isSaOnly}
                      onClick={() => {
                        const current = sortedRounds.find(
                          (r) => r.round_number === roundNumber
                        );
                        const method = String(
                          current?.competition_method || ''
                        ).toLowerCase();
                        const cfg = current?.competition_method_config;
                        const scheduleMode =
                          cfg && typeof cfg === 'object'
                            ? String(
                                (cfg as Record<string, unknown>).schedule_mode || ''
                              ).toLowerCase()
                            : '';
                        const isRr =
                          isTeamEvent &&
                          (method === 'round_robin' ||
                            scheduleMode === 'league' ||
                            scheduleMode === 'pairwise');
                        setScoreSheetLayout(
                          isRr ? 'round_robin' : isTeamEvent ? 'team' : 'bowler'
                        );
                        setStep('scoreSheets');
                      }}
                    >
                      Configure
                    </Button>
                  </li>
                )}
                {!tournamentOnly && (
                  <li className="rounded border border-border bg-surface-light px-3 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-text">Lane Assignments</p>
                      <p className="text-xs text-text-muted mt-1">
                        Team or bowler × games — lane label for each game (stamp or
                        projected movement).
                      </p>
                    </div>
                    <Button
                      variant="primary"
                      size="small"
                      disabled={busy || isSaOnly}
                      onClick={() => setStep('laneAssignments')}
                    >
                      Configure
                    </Button>
                  </li>
                )}
                <li className="rounded border border-border bg-surface-light px-3 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-text">Lane Pair Conflicts</p>
                    <p className="text-xs text-text-muted mt-1">
                      Who reused a lane pair across rounds
                      {tournamentOnly ? ' or events' : ' in this event'} (warn-only).
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    size="small"
                    disabled={busy || isSaOnly}
                    onClick={() => void runLaneConflicts()}
                  >
                    Preview
                  </Button>
                </li>
                {stepladderRounds.length > 0 && (
                  <li className="rounded border border-border bg-surface-light px-3 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-text">Stepladder</p>
                      <p className="text-xs text-text-muted mt-1">
                        Climb diagram — lowest seeds open, winners climb toward #1.
                      </p>
                    </div>
                    <Button
                      variant="primary"
                      size="small"
                      disabled={busy || isSaOnly}
                      onClick={() => {
                        if (stepladderRounds.length === 1) {
                          void runStepladder(stepladderRounds[0].id);
                          return;
                        }
                        setStepladderRoundId(stepladderRounds[0]?.id ?? null);
                        setStep('stepladder');
                      }}
                    >
                      {stepladderRounds.length === 1 ? 'Preview' : 'Configure'}
                    </Button>
                  </li>
                )}
                {!tournamentOnly && (
                  <li className="rounded border border-border bg-surface-light px-3 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-text">Event Financials</p>
                      <p className="text-xs text-text-muted mt-1">
                        Event settlement only (entries, house cut, prize pool). Side action
                        excluded.
                      </p>
                    </div>
                    <Button
                      variant="primary"
                      size="small"
                      disabled={busy || isSaOnly}
                      onClick={() => void runFinancials()}
                    >
                      Preview
                    </Button>
                  </li>
                )}
                <li className="rounded border border-border bg-surface-light px-3 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-text">Side Action Financials</p>
                    <p className="text-xs text-text-muted mt-1">
                      {tournamentOnly
                        ? 'All side actions by event — intake, fees, payouts, refunds (no bowler detail).'
                        : 'All side actions on this event — intake, fees, payouts, refunds (no bowler detail).'}
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    size="small"
                    disabled={busy}
                    onClick={() => void runSideActionFinancials()}
                  >
                    Preview
                  </Button>
                </li>
                {!tournamentOnly && (
                  <li className="rounded border border-border bg-surface-light px-3 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-text">Event Roster</p>
                      <p className="text-xs text-text-muted mt-1">
                        Registered bowlers with optional check-in, USBC, average, lane, and
                        paid/due columns.
                      </p>
                    </div>
                    <Button
                      variant="primary"
                      size="small"
                      disabled={busy}
                      onClick={() => setStep('roster')}
                    >
                      Configure
                    </Button>
                  </li>
                )}
              </ul>
            </div>
          )}

          {step === 'standings' && (
            <EventStandingsReportOptions
              tournamentOnly={tournamentOnly}
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
              showTeamNameOptions={showTeamNameOptions}
              allowIndividualTeamScores={allowIndividualTeamScores}
              showIndividualTeamScores={showIndividualTeamScores}
              onShowIndividualTeamScoresChange={setShowIndividualTeamScores}
              showTeamNames={showTeamNames}
              onShowTeamNamesChange={setShowTeamNames}
              showBowlerNames={showBowlerNames}
              onShowBowlerNamesChange={setShowBowlerNames}
              busy={busy}
              previewDisabled={
                tournamentOnly && basis === 'round' && tournamentRoundsLoadFailed
              }
              onBack={() => setStep('menu')}
              onPreview={() => void runStandings()}
              onExportExcel={() => void runStandingsExcel(false)}
            />
          )}

          {step === 'roster' && (
            <EventRosterReportOptions
              scope={rosterScope}
              onScopeChange={setRosterScope}
              squadId={squadId}
              onSquadIdChange={setSquadId}
              squads={squads}
              includeCheckin={includeCheckin}
              onIncludeCheckinChange={setIncludeCheckin}
              includeUsbc={includeUsbc}
              onIncludeUsbcChange={setIncludeUsbc}
              includeAverage={includeAverage}
              onIncludeAverageChange={setIncludeAverage}
              includeHandicap={includeRosterHandicap}
              onIncludeHandicapChange={setIncludeRosterHandicap}
              includeLane={includeLane}
              onIncludeLaneChange={setIncludeLane}
              includePaid={includePaid}
              onIncludePaidChange={setIncludePaid}
              busy={busy}
              onBack={() => setStep('menu')}
              onPreview={() => void runRoster()}
            />
          )}

          {step === 'singleGame' && (
            <SingleGameReportOptions
              tournamentOnly={tournamentOnly}
              scope={scope}
              onScopeChange={setScope}
              roundNumber={roundNumber}
              onRoundNumberChange={setRoundNumber}
              sortedRounds={sortedRounds}
              gameNumber={gameNumber}
              onGameNumberChange={setGameNumber}
              maxGames={maxGamesForSelectedRound}
              squadId={squadId}
              onSquadIdChange={setSquadId}
              squads={squads}
              includeHandicap={includeHandicap}
              onIncludeHandicapChange={setIncludeHandicap}
              showTeamNameOptions={showTeamNameOptions}
              allowIndividualTeamScores={allowIndividualTeamScores}
              showIndividualTeamScores={showIndividualTeamScores}
              onShowIndividualTeamScoresChange={setShowIndividualTeamScores}
              showTeamNames={showTeamNames}
              onShowTeamNamesChange={setShowTeamNames}
              showBowlerNames={showBowlerNames}
              onShowBowlerNamesChange={setShowBowlerNames}
              busy={busy}
              previewDisabled={
                tournamentOnly && tournamentRoundsLoadFailed
              }
              onBack={() => setStep('menu')}
              onPreview={() => void runSingleGame()}
            />
          )}

          {step === 'prizeFund' && (
            <PrizeFundReportOptions
              tournamentOnly={tournamentOnly}
              scope={prizeFundScope}
              onScopeChange={setPrizeFundScope}
              includeFundSummary={includeFundSummary}
              onIncludeFundSummaryChange={setIncludeFundSummary}
              includeWinners={includeWinners}
              onIncludeWinnersChange={setIncludeWinners}
              busy={busy}
              onBack={() => setStep('menu')}
              onPreview={() => void runPrizeFund()}
            />
          )}

          {step === 'scoreSheets' && (
            <ScoreSheetsReportOptions
              isTeamEvent={isTeamEvent}
              layout={scoreSheetLayout}
              onLayoutChange={setScoreSheetLayout}
              roundNumber={roundNumber}
              onRoundNumberChange={setRoundNumber}
              sortedRounds={sortedRounds}
              squadId={scoreSheetSquadId}
              onSquadIdChange={setScoreSheetSquadId}
              squads={squads}
              includeIndividualHandicap={includeIndividualHandicap}
              onIncludeIndividualHandicapChange={setIncludeIndividualHandicap}
              includeTeamHandicap={includeTeamHandicap}
              onIncludeTeamHandicapChange={setIncludeTeamHandicap}
              busy={busy}
              onBack={() => setStep('menu')}
              onPreview={() => void runScoreSheets()}
            />
          )}

          {step === 'laneAssignments' && (
            <LaneAssignmentSheetsReportOptions
              isTeamEvent={isTeamEvent}
              roundNumber={roundNumber}
              onRoundNumberChange={setRoundNumber}
              sortedRounds={sortedRounds}
              squadId={laneAssignSquadId}
              onSquadIdChange={setLaneAssignSquadId}
              squads={squads}
              busy={busy}
              onBack={() => setStep('menu')}
              onPreview={() => void runLaneAssignments()}
            />
          )}

          {step === 'stepladder' && (
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="stepladder-round"
                  className="block text-sm font-medium text-text mb-1"
                >
                  Stepladder round
                </label>
                <select
                  id="stepladder-round"
                  className="mt-1 w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
                  value={stepladderRoundId ?? ''}
                  onChange={(e) => setStepladderRoundId(Number(e.target.value) || null)}
                >
                  {stepladderRounds.map((round) => (
                    <option key={round.id} value={round.id}>
                      {[round.eventName, round.friendly_name || `Round ${round.round_number}`]
                        .filter(Boolean)
                        .join(' · ')}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-wrap gap-2 justify-end">
                <Button
                  variant="secondary"
                  size="small"
                  disabled={busy}
                  onClick={() => setStep('menu')}
                >
                  Back
                </Button>
                <Button
                  variant="primary"
                  size="small"
                  disabled={busy || !stepladderRoundId}
                  onClick={() => void runStepladder()}
                >
                  Preview stepladder
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      <SideActionReportPreviewModal
        isOpen={previewDoc != null}
        document={previewDoc}
        onClose={() => setPreviewDoc(null)}
      />
    </>
  );
};

export default EventReportsMenuModal;
