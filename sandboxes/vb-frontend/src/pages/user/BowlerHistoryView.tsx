import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { TournamentsAPI } from '../../api/tournaments';
import { UsersAPI } from '../../api/users';
import { useAuth } from '../../contexts/AuthContext';
import { Role } from '../../types/user';
import Alert from '../../components/common/Alert';
import Loading from '../../components/common/Loading';
import Button from '../../components/common/Button';
import ReportScoreProblemModal, {
  type ReportScoreProblemTarget,
} from '../../components/account/ReportScoreProblemModal';
import { formatDateNaive } from '../../utils/dateUtils';
import PageSectionHeading from '../../components/common/PageSectionHeading';
import { useRoleAwareNavigation } from '../../utils/roleBasedRouting';
import { formatStatNumber } from '../dashboard/bowlerStatDisplay';
import {
  formatHandicap,
  formatPinfall,
  formatPlace,
  gameScoreColumnNumbers,
  scoresForGameNumber,
} from '../dashboard/bowlerStatsEventGrid';
import {
  entryFeeDisplay,
  formatMoney,
  sideActionEnteredDisplay,
  teamSideActionEnteredDisplay,
  teamSideActionPerMemberTitle,
  teamSideActionWonDisplay,
} from '../dashboard/bowlerFinancialEvents';
import { enteredTournamentsForBowlerHome } from '../dashboard/bowlerHomeTournaments';
import {
  buildBowlerFinancialsExcelCsv,
  buildBowlerScoresExcelCsv,
} from '../dashboard/bowlerHistoryExcel';
import { csvBlobForExcel } from '../../utils/excelCsv';
import { downloadBlob } from '../../utils/downloadBlob';
import { getErrorMessage } from '../../api/apiErrors';
import { tournamentStandingsPath } from '../../utils/appUrl';
import BowlerSaPotsMenu from '../dashboard/BowlerSaPotsMenu';

type PerformanceTimeframe = 'all' | '365days' | '90days' | '30days';
export type BowlerHistoryTab = 'scores' | 'financials';
type StatsView = 'events' | 'games';

type PerformanceMetrics = {
  average_lifetime_score?: number | null;
  average_365day_score?: number | null;
  average_90day_score?: number | null;
  high_game?: number | null;
  tournament_wins?: number;
  tournaments_participated?: number;
};

function resolvePageTab(tabParam: string | null): BowlerHistoryTab {
  return tabParam === 'financials' ? 'financials' : 'scores';
}

export type BowlerHistoryViewProps = {
  subjectUserId: number;
  showReport: boolean;
  financialEmptyMessage?: string;
};

const BowlerHistoryView: React.FC<BowlerHistoryViewProps> = ({
  subjectUserId,
  showReport,
  financialEmptyMessage = 'No approved event registrations yet.',
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const roleAwareNav = useRoleAwareNavigation(user);
  const [searchParams, setSearchParams] = useSearchParams();
  const [timeframe, setTimeframe] = useState<PerformanceTimeframe>('all');
  const [pageTab, setPageTab] = useState<BowlerHistoryTab>(() =>
    resolvePageTab(searchParams.get('tab'))
  );
  const [view, setView] = useState<StatsView>('events');
  const [reportTarget, setReportTarget] = useState<ReportScoreProblemTarget | null>(null);
  const [reportSuccess, setReportSuccess] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const isOwnOrAdmin =
    user?.id === subjectUserId || user?.role === Role.ADMIN;

  useEffect(() => {
    setPageTab(resolvePageTab(searchParams.get('tab')));
  }, [searchParams]);

  const setActivePageTab = (next: BowlerHistoryTab) => {
    setPageTab(next);
    const nextParams = new URLSearchParams(searchParams);
    if (next === 'financials') {
      nextParams.set('tab', 'financials');
    } else {
      nextParams.delete('tab');
    }
    setSearchParams(nextParams, { replace: true });
  };

  const {
    data: performanceData,
    isLoading: isPerformanceLoading,
    error: performanceError,
  } = useQuery({
    queryKey: ['userPerformance', subjectUserId, timeframe],
    queryFn: async () => {
      return (await UsersAPI.getUserPerformanceMetrics(
        subjectUserId,
        timeframe
      )) as PerformanceMetrics;
    },
    enabled: pageTab === 'scores',
  });

  const {
    data: bowledEvents = [],
    isLoading: isBowledLoading,
    error: bowledError,
  } = useQuery({
    queryKey: ['userBowledEvents', subjectUserId],
    queryFn: () => UsersAPI.getUserBowledEvents(subjectUserId),
    enabled: pageTab === 'scores',
  });

  const {
    data: financialEvents = [],
    isLoading: isFinancialLoading,
    error: financialError,
  } = useQuery({
    queryKey: ['userFinancialEvents', subjectUserId],
    queryFn: () => UsersAPI.getUserFinancialEvents(subjectUserId),
    enabled: pageTab === 'financials',
  });

  const {
    data: enteredTournaments = [],
    isLoading: isHistoryLoading,
  } = useQuery({
    queryKey: ['userTournaments', subjectUserId],
    queryFn: async () => {
      const rows = await TournamentsAPI.getUserTournaments(subjectUserId);
      return enteredTournamentsForBowlerHome(Array.isArray(rows) ? rows : []);
    },
    enabled: isOwnOrAdmin && pageTab === 'scores',
  });

  const financialTotals = useMemo(() => {
    return {
      entryFees: financialEvents.reduce(
        (sum, row) => sum + Number(row.entry_fee_paid ?? row.entry_fee ?? 0),
        0
      ),
      saFees: financialEvents.reduce((sum, row) => sum + Number(row.side_action_entry_fees || 0), 0),
      saWon: financialEvents.reduce((sum, row) => sum + Number(row.side_action_winnings || 0), 0),
      teamSaFees: financialEvents.reduce(
        (sum, row) => sum + Number(row.team_side_action_entry_fees || 0),
        0
      ),
      teamSaWon: financialEvents.reduce(
        (sum, row) => sum + Number(row.team_side_action_winnings || 0),
        0
      ),
    };
  }, [financialEvents]);

  const pageLoading =
    pageTab === 'scores'
      ? isPerformanceLoading || isBowledLoading || (isOwnOrAdmin && isHistoryLoading)
      : isFinancialLoading;

  if (pageLoading) {
    return (
      <div className="flex justify-center items-center h-48">
        <Loading />
      </div>
    );
  }

  const loadError = pageTab === 'scores' ? performanceError || bowledError : financialError;
  const gameColumns = gameScoreColumnNumbers(bowledEvents);
  const averageScore =
    timeframe === 'all'
      ? performanceData?.average_lifetime_score
      : timeframe === '365days'
        ? performanceData?.average_365day_score
        : performanceData?.average_90day_score;
  const tournamentCount = isOwnOrAdmin
    ? enteredTournaments.length
    : performanceData?.tournaments_participated ?? 0;

  const canOpenEvent = (organizerUserId?: number | null) => {
    if (user?.role === Role.ADMIN || user?.id === subjectUserId) return true;
    if (user?.role === Role.TD) return organizerUserId === user.id;
    return false;
  };

  const openEventInfo = (eventId: number) => {
    navigate(roleAwareNav.getEventPath(eventId));
  };

  const eventResultsPath = (tournamentId: number, eventId: number) =>
    tournamentStandingsPath(tournamentId, eventId);

  const moneyLinkClass =
    'text-left text-primary hover:text-text-muted underline-offset-2 hover:underline disabled:no-underline disabled:text-text-muted disabled:cursor-default';

  const exportScores = async () => {
    setExportError(null);
    try {
      await downloadBlob(
        csvBlobForExcel(buildBowlerScoresExcelCsv(bowledEvents)),
        'bowler_game_scores.csv'
      );
    } catch (err) {
      setExportError(getErrorMessage(err, 'Failed to export scores.'));
    }
  };

  const exportFinancials = async () => {
    setExportError(null);
    try {
      await downloadBlob(
        csvBlobForExcel(buildBowlerFinancialsExcelCsv(financialEvents)),
        'bowler_financials.csv'
      );
    } catch (err) {
      setExportError(getErrorMessage(err, 'Failed to export financials.'));
    }
  };

  return (
    <>
      <div className="flex flex-wrap gap-2 mb-6 border-b border-border pb-3">
        <button
          type="button"
          onClick={() => setActivePageTab('scores')}
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            pageTab === 'scores'
              ? 'bg-primary text-white'
              : 'bg-surface-light text-text-muted hover:bg-surface'
          }`}
        >
          Scores
        </button>
        <button
          type="button"
          onClick={() => setActivePageTab('financials')}
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            pageTab === 'financials'
              ? 'bg-primary text-white'
              : 'bg-surface-light text-text-muted hover:bg-surface'
          }`}
        >
          Financials
        </button>
      </div>

      {reportSuccess && (
        <Alert
          variant="success"
          message={reportSuccess}
          onDismiss={() => setReportSuccess(null)}
          className="mb-4"
        />
      )}

      {exportError && (
        <Alert
          variant="error"
          message={exportError}
          onDismiss={() => setExportError(null)}
          className="mb-4"
        />
      )}

      {loadError && (
        <Alert
          variant="error"
          message="Some data could not be loaded. You can still browse what did return."
          className="mb-4"
        />
      )}

      {pageTab === 'scores' && (
        <>
          <div className="flex flex-wrap gap-2 mb-4">
            {(['all', '365days', '90days', '30days'] as const).map((value) => (
              <button
                key={value}
                onClick={() => setTimeframe(value)}
                className={`px-3 py-1 rounded-full text-sm whitespace-nowrap ${
                  timeframe === value ? 'bg-primary text-text' : 'bg-surface-light text-text-muted'
                }`}
              >
                {value === 'all'
                  ? 'All Time'
                  : value === '365days'
                    ? 'Last 365 Days'
                    : value === '90days'
                      ? 'Last 90 Days'
                      : 'Last 30 Days'}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-surface rounded-lg shadow p-4 text-center">
              <p className="text-sm text-text-muted mb-1">Average</p>
              <p className="text-2xl font-bold text-primary">{formatStatNumber(averageScore)}</p>
            </div>
            <div className="bg-surface rounded-lg shadow p-4 text-center">
              <p className="text-sm text-text-muted mb-1">Best Game</p>
              <p className="text-2xl font-bold text-primary">{formatStatNumber(performanceData?.high_game)}</p>
            </div>
            <div className="bg-surface rounded-lg shadow p-4 text-center">
              <p className="text-sm text-text-muted mb-1">Events bowled</p>
              <p className="text-2xl font-bold text-primary">{bowledEvents.length}</p>
            </div>
            <div className="bg-surface rounded-lg shadow p-4 text-center">
              <p className="text-sm text-text-muted mb-1">Tournaments</p>
              <p className="text-2xl font-bold text-primary">{tournamentCount}</p>
            </div>
          </div>

          <div className="flex justify-between items-center mb-2 gap-2">
            <PageSectionHeading>
              {view === 'events' ? 'Bowled events' : 'Game scores'}
            </PageSectionHeading>
            <div className="flex items-center gap-2 shrink-0">
              {view === 'games' && (
                <button
                  className="text-primary hover:text-text-muted text-sm font-medium"
                  onClick={() => setView('events')}
                >
                  Back to events
                </button>
              )}
              <Button
                variant="lightbackground"
                size="small"
                disabled={bowledEvents.length === 0}
                onClick={() => void exportScores()}
              >
                Export Excel
              </Button>
            </div>
          </div>

          <div className="bg-surface rounded-lg overflow-hidden shadow">
            {view === 'events' && bowledEvents.length === 0 && (
              <p className="text-text-muted p-6 text-center">No Results</p>
            )}

            {view === 'events' && bowledEvents.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-surface-light">
                    <tr>
                      <th className="py-3 pl-4 pr-2 text-left text-text-muted text-sm">Event</th>
                      <th className="py-3 px-2 text-left text-text-muted text-sm">Tournament</th>
                      <th className="py-3 px-2 text-left text-text-muted text-sm">Date</th>
                      <th className="py-3 px-2 text-right text-text-muted text-sm">Place</th>
                      <th className="py-3 px-2 text-right text-text-muted text-sm">Pinfall</th>
                      <th className="py-3 px-2 text-right text-text-muted text-sm">HCP</th>
                      <th className="py-3 px-2 text-right text-text-muted text-sm">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {bowledEvents.map((event) => (
                      <tr
                        key={event.event_id}
                        className="hover:bg-surface-light cursor-pointer"
                        onClick={() =>
                          navigate(eventResultsPath(event.tournament_id, event.event_id))
                        }
                      >
                        <td className="py-3 pl-4 pr-2 text-text">
                          <Link
                            to={eventResultsPath(event.tournament_id, event.event_id)}
                            className="font-medium text-primary hover:underline"
                            onClick={(click) => click.stopPropagation()}
                          >
                            {event.event_name}
                          </Link>
                        </td>
                        <td className="py-3 px-2 text-text-muted">{event.tournament_name}</td>
                        <td className="py-3 px-2 text-text-muted">{formatDateNaive(event.start_date)}</td>
                        <td className="py-3 px-2 text-right tabular-nums text-text">
                          {formatPlace(event.place)}
                        </td>
                        <td className="py-3 px-2 text-right tabular-nums text-text">
                          {formatPinfall(event.pinfall)}
                        </td>
                        <td className="py-3 px-2 text-right tabular-nums text-text-muted">
                          {formatHandicap(event.handicap)}
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex flex-wrap justify-end gap-2">
                            {showReport && (
                              <Button
                                variant="lightbackground"
                                size="small"
                                onClick={(click) => {
                                  click.stopPropagation();
                                  setReportTarget({
                                    eventId: event.event_id,
                                    eventName: event.event_name,
                                    tournamentName: event.tournament_name,
                                  });
                                }}
                              >
                                Report
                              </Button>
                            )}
                            {canOpenEvent(event.organizer_user_id) && (
                              <Button
                                variant="lightbackground"
                                size="small"
                                onClick={(click) => {
                                  click.stopPropagation();
                                  navigate(roleAwareNav.getTournamentPath(event.tournament_id));
                                }}
                              >
                                View tournament
                              </Button>
                            )}
                            <Button
                              variant="darkbackground"
                              size="small"
                              onClick={(click) => {
                                click.stopPropagation();
                                setView('games');
                              }}
                            >
                              View games
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {view === 'games' && bowledEvents.length === 0 && (
              <p className="text-text-muted p-6 text-center">No Results</p>
            )}

            {view === 'games' && bowledEvents.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-surface-light">
                    <tr>
                      <th className="py-3 pl-4 pr-2 text-left text-text-muted text-sm">Event</th>
                      {gameColumns.map((gameNumber) => (
                        <th key={gameNumber} className="py-3 px-2 text-center text-text-muted text-sm">
                          Game {gameNumber}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {bowledEvents.map((event) => (
                      <tr key={event.event_id} className="hover:bg-surface-light">
                        <td className="py-3 pl-4 pr-2 text-text">
                          <Link
                            to={eventResultsPath(event.tournament_id, event.event_id)}
                            className="font-medium text-primary hover:underline"
                          >
                            {event.event_name}
                          </Link>
                          <div className="text-xs text-text-dim">{event.tournament_name}</div>
                          {showReport && (
                            <button
                              type="button"
                              className="mt-1 text-xs text-primary hover:text-text-muted"
                              onClick={() =>
                                setReportTarget({
                                  eventId: event.event_id,
                                  eventName: event.event_name,
                                  tournamentName: event.tournament_name,
                                })
                              }
                            >
                              Report
                            </button>
                          )}
                        </td>
                        {gameColumns.map((gameNumber) => (
                          <td key={gameNumber} className="py-3 px-2 text-center text-text-muted">
                            {scoresForGameNumber(event, gameNumber)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {pageTab === 'financials' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-surface rounded-lg shadow p-4 text-center">
              <p className="text-sm text-text-muted mb-1">Events</p>
              <p className="text-2xl font-bold text-primary">{financialEvents.length}</p>
            </div>
            <div className="bg-surface rounded-lg shadow p-4 text-center">
              <p className="text-sm text-text-muted mb-1">Entry fees</p>
              <p className="text-2xl font-bold text-primary">{formatMoney(financialTotals.entryFees)}</p>
            </div>
            <div className="bg-surface rounded-lg shadow p-4 text-center">
              <p className="text-sm text-text-muted mb-1">Side action entered</p>
              <p className="text-2xl font-bold text-primary">{formatMoney(financialTotals.saFees)}</p>
            </div>
            <div className="bg-surface rounded-lg shadow p-4 text-center">
              <p className="text-sm text-text-muted mb-1">Side action won</p>
              <p className="text-2xl font-bold text-primary">{formatMoney(financialTotals.saWon)}</p>
            </div>
            <div className="bg-surface rounded-lg shadow p-4 text-center">
              <p className="text-sm text-text-muted mb-1">Team side action entered</p>
              <p className="text-2xl font-bold text-primary">{formatMoney(financialTotals.teamSaFees)}</p>
            </div>
            <div className="bg-surface rounded-lg shadow p-4 text-center">
              <p className="text-sm text-text-muted mb-1">Team side action won</p>
              <p className="text-2xl font-bold text-primary">{formatMoney(financialTotals.teamSaWon)}</p>
            </div>
          </div>

          <div className="flex justify-between items-center mb-2 gap-2">
            <PageSectionHeading>Event financials</PageSectionHeading>
            <Button
              variant="lightbackground"
              size="small"
              disabled={financialEvents.length === 0}
              onClick={() => void exportFinancials()}
            >
              Export Excel
            </Button>
          </div>

          <div className="bg-surface rounded-lg overflow-hidden shadow">
            {financialEvents.length === 0 ? (
              <p className="text-text-muted p-6 text-center">{financialEmptyMessage}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-surface-light">
                    <tr>
                      <th className="py-3 pl-4 pr-2 text-left text-text-muted text-sm">Event</th>
                      <th className="py-3 px-2 text-left text-text-muted text-sm">Date</th>
                      <th className="py-3 px-2 text-right text-text-muted text-sm">Entry fee</th>
                      <th className="py-3 px-2 text-right text-text-muted text-sm">Prize fund</th>
                      <th className="py-3 px-2 text-right text-text-muted text-sm">SA entered</th>
                      <th className="py-3 px-2 text-right text-text-muted text-sm">SA won</th>
                      <th className="py-3 px-2 text-right text-text-muted text-sm">Team SA entered</th>
                      <th className="py-3 px-2 text-right text-text-muted text-sm">Team SA won</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {financialEvents.map((row) => {
                      const openable = canOpenEvent(row.organizer_user_id);
                      const teamEnteredTitle = teamSideActionPerMemberTitle(
                        row.team_side_action_entry_fees,
                        row.team_size
                      );
                      const teamWonTitle = teamSideActionPerMemberTitle(
                        row.team_side_action_winnings,
                        row.team_size
                      );
                      const teamEnteredAmount = Number(row.team_side_action_entry_fees || 0);
                      const teamWonAmount = Number(row.team_side_action_winnings || 0);
                      return (
                        <tr key={row.event_id} className="hover:bg-surface-light">
                          <td className="py-3 pl-4 pr-2 text-text">
                            <Link
                              to={eventResultsPath(row.tournament_id, row.event_id)}
                              className="font-medium text-primary hover:underline"
                            >
                              {row.event_name}
                            </Link>
                            <div className="text-xs text-text-dim">{row.tournament_name}</div>
                          </td>
                          <td className="py-3 px-2 text-text-muted whitespace-nowrap">
                            {formatDateNaive(row.start_date)}
                          </td>
                          <td className="py-3 px-2 text-right">
                            {openable ? (
                              <button
                                type="button"
                                className={moneyLinkClass}
                                onClick={() => openEventInfo(row.event_id)}
                                title="Open event info"
                              >
                                {entryFeeDisplay(row)}
                              </button>
                            ) : (
                              entryFeeDisplay(row)
                            )}
                          </td>
                          <td className="py-3 px-2 text-right">
                            {openable ? (
                              <button
                                type="button"
                                className={moneyLinkClass}
                                onClick={() => openEventInfo(row.event_id)}
                                title="Open prize fund on event info"
                              >
                                {formatMoney(row.prize_fund)}
                              </button>
                            ) : (
                              formatMoney(row.prize_fund)
                            )}
                          </td>
                          <td className="py-3 px-2 text-right">
                            <BowlerSaPotsMenu
                              label="Side action"
                              amountDisplay={sideActionEnteredDisplay(row)}
                              pots={row.side_action_pots || []}
                              disabled={(row.side_action_pots || []).length === 0}
                            />
                          </td>
                          <td className="py-3 px-2 text-right">
                            <BowlerSaPotsMenu
                              label="Side action"
                              amountDisplay={
                                Number(row.side_action_winnings || 0) > 0
                                  ? formatMoney(row.side_action_winnings)
                                  : '—'
                              }
                              pots={row.side_action_pots || []}
                              disabled={
                                (row.side_action_pots || []).length === 0 ||
                                Number(row.side_action_winnings || 0) <= 0
                              }
                            />
                          </td>
                          <td className="py-3 px-2 text-right">
                            <BowlerSaPotsMenu
                              label="Team side action"
                              amountDisplay={teamSideActionEnteredDisplay(row)}
                              pots={row.team_side_action_pots || []}
                              disabled={
                                (row.team_side_action_pots || []).length === 0 ||
                                teamEnteredAmount <= 0
                              }
                              title={teamEnteredTitle}
                            />
                          </td>
                          <td className="py-3 px-2 text-right">
                            <BowlerSaPotsMenu
                              label="Team side action"
                              amountDisplay={teamSideActionWonDisplay(row)}
                              pots={row.team_side_action_pots || []}
                              disabled={
                                (row.team_side_action_pots || []).length === 0 ||
                                teamWonAmount <= 0
                              }
                              title={teamWonTitle}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {showReport && (
        <ReportScoreProblemModal
          isOpen={Boolean(reportTarget)}
          target={reportTarget}
          onClose={() => setReportTarget(null)}
          onSubmitted={() =>
            setReportSuccess('Report submitted. Victory will review it on the admin dashboard.')
          }
        />
      )}
    </>
  );
};

export default BowlerHistoryView;
