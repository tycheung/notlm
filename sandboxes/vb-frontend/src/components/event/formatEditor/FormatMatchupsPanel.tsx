import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { RoundsAPI } from '../../../api/rounds';
import {
  RoundMatchSeriesAPI,
} from '../../../api/round-match-series';
import { getErrorMessage } from '../../../api/apiErrors';
import type { RoundRead } from '../../../types/round';
import { AdvancementMethod } from '../../../types/roundRelationship';
import Alert from '../../common/Alert';
import Button from '../../common/Button';
import Loading from '../../common/Loading';
import RoundRobinScheduleSettings, {
  type RoundRobinScheduleConfig,
} from './RoundRobinScheduleSettings';
import HeadToHeadMatchupsHome from './HeadToHeadMatchupsHome';
import BracketMatchupsPanel from './BracketMatchupsPanel';
import PodsMatchupsPanel from './PodsMatchupsPanel';
import {
  groupSeriesByGame,
  scheduleConfigFromRound,
  scheduleConfigToPatch,
} from './roundRobinMatchupsUtils';
import { pickRoundGameScoring } from '../../../utils/roundGameScoring';
import { matchSeriesSideLabel } from '../../../utils/matchSeriesSideLabel';
import { invalidateEventFlowStructureQueries } from '../flow/RoundFlowManagement';
import { EventLanesAPI, invalidateEventLaneQueries } from '../../../features/lanes';
import { useFormatEditorMatchupQueries } from '../../../hooks/useFormatEditorMatchupQueries';
import { allowsStandingsBasedSeeding } from './openingRoundSeeding';

interface FormatMatchupsPanelProps {
  eventId: number;
  round: RoundRead;
  isTeamEvent: boolean;
  onConfigSaved?: () => void;
  tournamentName?: string | null;
  eventName?: string | null;
}

/**
 * Format Editor Matchups: RR schedule + pair grid; bracket seed settings + tree;
 * pods size/advance/balance desk; otherwise thin H2H home (stepladder).
 */
const FormatMatchupsPanel: React.FC<FormatMatchupsPanelProps> = (props) => {
  const method = String(props.round.competition_method || '').toLowerCase();
  const isRoundRobin =
    method === AdvancementMethod.ROUND_ROBIN || method === 'round_robin';
  if (isRoundRobin) {
    return <RoundRobinMatchupsPanel {...props} />;
  }
  const isBracket = method === AdvancementMethod.BRACKET || method === 'bracket';
  if (isBracket) {
    return <BracketMatchupsPanel {...props} />;
  }
  const isPods = method === AdvancementMethod.PODS || method === 'pods';
  if (isPods) {
    return <PodsMatchupsPanel {...props} />;
  }
  return (
    <HeadToHeadMatchupsHome
      eventId={props.eventId}
      round={props.round}
      isTeamEvent={props.isTeamEvent}
      tournamentName={props.tournamentName}
      eventName={props.eventName}
    />
  );
};

const RoundRobinMatchupsPanel: React.FC<FormatMatchupsPanelProps> = ({
  eventId,
  round,
  isTeamEvent,
  onConfigSaved,
}) => {
  const queryClient = useQueryClient();

  const [scheduleDraft, setScheduleDraft] = useState<RoundRobinScheduleConfig>(() =>
    scheduleConfigFromRound(round)
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    setScheduleDraft(scheduleConfigFromRound(round));
  }, [round.id, round.updated_at]);

  const { seriesQuery, readinessQuery, teamsQuery, participantsQuery } =
    useFormatEditorMatchupQueries(eventId, round.id, isTeamEvent);

  const allowStandingsSeeding = allowsStandingsBasedSeeding({
    isInitialRound: readinessQuery.data?.is_initial_round,
  });

  const teamNames = useMemo(() => {
    const map = new Map<number, string>();
    for (const team of teamsQuery.data || []) {
      map.set(team.id, team.display_name || team.team_name || `Team ${team.id}`);
    }
    return map;
  }, [teamsQuery.data]);

  const participantNames = useMemo(() => {
    const map = new Map<number, string>();
    for (const row of participantsQuery.data || []) {
      map.set(row.event_participant_id, row.user_name || `Bowler ${row.event_participant_id}`);
    }
    return map;
  }, [participantsQuery.data]);

  const matchSeries = seriesQuery.data?.match_series ?? [];
  const sections = useMemo(() => groupSeriesByGame(matchSeries), [matchSeries]);

  const scoring = pickRoundGameScoring(
    (round.competition_method_config || {}) as Record<string, unknown>
  );
  const bakerBadge = scoring.game_style === 'baker';

  const updateScheduleDraft = useCallback((patch: Partial<RoundRobinScheduleConfig>) => {
    setScheduleDraft((prev) => ({ ...prev, ...patch }));
    setActionSuccess(null);
  }, []);

  const saveAndSyncMutation = useMutation({
    mutationFn: async (opts: { sync: boolean; fillPosition?: boolean }) => {
      const prevCfg = (round.competition_method_config || {}) as Record<string, unknown>;
      const nextCfg = scheduleConfigToPatch(scheduleDraft, prevCfg);
      await RoundsAPI.updateRound(round.id, {
        competition_method_config: nextCfg as RoundRead['competition_method_config'],
      });
      if (opts.sync) {
        await RoundMatchSeriesAPI.syncMatchStructure(round.id);
      }
      if (opts.fillPosition && scheduleDraft.position_round_game) {
        await RoundMatchSeriesAPI.applyPositionRound(round.id, {
          game: Number(scheduleDraft.position_round_game),
          fill_from_standings: true,
        });
      }
    },
    onSuccess: async (_data, vars) => {
      setActionError(null);
      setActionSuccess(
        vars.sync
          ? 'Schedule saved and matchups regenerated.'
          : 'Schedule settings saved.'
      );
      await queryClient.invalidateQueries({ queryKey: ['roundMatchSeries', round.id] });
      await queryClient.invalidateQueries({ queryKey: ['matchStructureReadiness', round.id] });
      await queryClient.invalidateQueries({ queryKey: ['round', round.id] });
      invalidateEventFlowStructureQueries(queryClient, eventId);
      onConfigSaved?.();
    },
    onError: (err) => {
      setActionError(getErrorMessage(err, 'Could not update matchups.'));
    },
  });

  const inheritLanesMutation = useMutation({
    mutationFn: async () => {
      // Persist schedule first so lane inherit reads the latest league config.
      const prevCfg = (round.competition_method_config || {}) as Record<string, unknown>;
      const nextCfg = scheduleConfigToPatch(scheduleDraft, prevCfg);
      await RoundsAPI.updateRound(round.id, {
        competition_method_config: nextCfg as RoundRead['competition_method_config'],
      });
      return EventLanesAPI.inheritFromMatchups(eventId, round.id, {
        replace_pairs: true,
      });
    },
    onSuccess: async (result) => {
      setActionError(null);
      setActionSuccess(result.message);
      await queryClient.invalidateQueries({ queryKey: ['round', round.id] });
      await invalidateEventLaneQueries(queryClient, eventId);
      invalidateEventFlowStructureQueries(queryClient, eventId);
      onConfigSaved?.();
    },
    onError: (err) => {
      setActionError(
        getErrorMessage(err, 'Could not apply league schedule to lane assignments.')
      );
    },
  });

  const setGameAsPosition = useCallback(
    (gameNumber: number) => {
      updateScheduleDraft({
        schedule_mode: 'league',
        position_round_game: gameNumber,
      });
    },
    [updateScheduleDraft]
  );

  const clearPositionRound = useCallback(() => {
    updateScheduleDraft({ position_round_game: null });
  }, [updateScheduleDraft]);

  const busy = saveAndSyncMutation.isPending || inheritLanesMutation.isPending;
  const isLeague = String(scheduleDraft.schedule_mode ?? 'league') === 'league';
  const readiness = readinessQuery.data;
  const canGenerate = readiness?.ready === true;
  const readinessMessage =
    readiness && !readiness.ready
      ? readiness.message
      : readinessQuery.isError
        ? getErrorMessage(readinessQuery.error, 'Could not check matchup readiness.')
        : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-text">
            Matchups
            {bakerBadge ? (
              <span className="ml-2 align-middle text-xs font-semibold uppercase tracking-wide text-primary">
                Baker
              </span>
            ) : null}
          </h3>
          <p className="mt-0.5 text-sm text-text-muted max-w-2xl">
            Configure how games are paired, then generate shells. Opening rounds use the
            current roster (re-generate if entries change). Later rounds wait until prior
            rounds are complete so seeding is available.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="small"
            variant="lightbackground"
            disabled={busy}
            onClick={() => saveAndSyncMutation.mutate({ sync: false })}
          >
            {busy && saveAndSyncMutation.isPending ? 'Saving…' : 'Save schedule'}
          </Button>
          {isLeague ? (
            <Button
              type="button"
              size="small"
              variant="lightbackground"
              disabled={busy || readinessQuery.isLoading || !canGenerate}
              title={
                readinessMessage ||
                'Set Lane Assignments to USBC league movement with the same team-count table'
              }
              onClick={() => inheritLanesMutation.mutate()}
            >
              {inheritLanesMutation.isPending
                ? 'Applying to lanes…'
                : 'Apply to lane assignments'}
            </Button>
          ) : null}
          <Button
            type="button"
            size="small"
            variant="primary"
            disabled={busy || readinessQuery.isLoading || !canGenerate}
            title={readinessMessage || undefined}
            onClick={() => saveAndSyncMutation.mutate({ sync: true })}
          >
            {busy && saveAndSyncMutation.isPending
              ? 'Generating…'
              : isLeague
                ? 'Generate from league schedule'
                : 'Generate matchups'}
          </Button>
        </div>
      </div>

      {readinessMessage && (
        <Alert variant="warning" message={readinessMessage} />
      )}
      {(readiness?.warnings ?? []).map((warning) => (
        <Alert key={warning} variant="warning" message={warning} />
      ))}

      {actionError && (
        <Alert variant="error" message={actionError} onDismiss={() => setActionError(null)} />
      )}
      {actionSuccess && (
        <Alert
          variant="success"
          message={actionSuccess}
          onDismiss={() => setActionSuccess(null)}
        />
      )}

      <div className="rounded-lg border border-border bg-surface p-4 space-y-3">
        <RoundRobinScheduleSettings
          methodConfig={scheduleDraft}
          onChange={updateScheduleDraft}
          compact
          eventId={eventId}
          currentRoundId={round.id}
          showSeedSource={allowStandingsSeeding}
        />
        {isLeague ? (
          <p className="text-xs text-text-muted">
            After generating matchups, use{' '}
            <span className="font-medium text-text">Apply to lane assignments</span> so
            Lane Assignments uses the same USBC league table and pair columns — avoids
            conflicting movement settings.
          </p>
        ) : null}
      </div>

      {seriesQuery.isLoading ? (
        <Loading size="medium" />
      ) : sections.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-surface-light/30 px-4 py-10 text-center">
          <p className="text-sm text-text-muted">
            No matchups yet. Choose a schedule source and click{' '}
            <span className="font-medium text-text">
              {isLeague ? 'Generate from league schedule' : 'Generate matchups'}
            </span>
            .
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-text-muted">
            {sections.length} game{sections.length === 1 ? '' : 's'}
            {` · ${matchSeries.length} matchups`}
            {scheduleDraft.position_round_game
              ? ` · position round on game ${scheduleDraft.position_round_game}`
              : ''}
          </p>
          {sections.map((section) => {
            const draftIsPosition =
              scheduleDraft.position_round_game != null &&
              Number(scheduleDraft.position_round_game) === section.gameNumber;
            const showAsPosition = section.isPosition || draftIsPosition;
            return (
              <div
                key={section.gameNumber}
                className="overflow-hidden rounded-lg border border-border bg-surface"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface-light/50 px-4 py-2.5">
                  <div className="font-medium text-text">
                    Game {section.gameNumber}
                    {showAsPosition ? (
                      <span className="ml-2 text-xs font-semibold uppercase tracking-wide text-primary">
                        Position
                      </span>
                    ) : null}
                  </div>
                  {isLeague && (
                    <div className="flex flex-wrap gap-2">
                      {draftIsPosition ? (
                        <Button
                          type="button"
                          size="small"
                          variant="lightbackground"
                          disabled={busy}
                          onClick={clearPositionRound}
                        >
                          Clear position round
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          size="small"
                          variant="lightbackground"
                          disabled={busy}
                          onClick={() => setGameAsPosition(section.gameNumber)}
                        >
                          Make position round
                        </Button>
                      )}
                      {section.isPosition && (
                        <Button
                          type="button"
                          size="small"
                          variant="darkbackground"
                          disabled={busy || !canGenerate}
                          title={readinessMessage || undefined}
                          onClick={() =>
                            saveAndSyncMutation.mutate({
                              sync: true,
                              fillPosition: true,
                            })
                          }
                        >
                          Lock from standings
                        </Button>
                      )}
                    </div>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="text-xs uppercase tracking-wide text-text-muted">
                      <tr>
                        <th className="px-4 py-2 font-medium w-16">#</th>
                        <th className="px-4 py-2 font-medium">Side A</th>
                        <th className="px-4 py-2 font-medium w-10 text-center">vs</th>
                        <th className="px-4 py-2 font-medium">Side B</th>
                      </tr>
                    </thead>
                    <tbody>
                      {section.series.map((s, idx) => (
                        <tr key={s.id} className="border-t border-border/60">
                          <td className="px-4 py-2.5 text-text-muted tabular-nums">
                            {(s.bracket_slot != null ? s.bracket_slot + 1 : idx + 1)}
                          </td>
                          <td className="px-4 py-2.5 font-medium text-text">
                            {matchSeriesSideLabel(s, 0, {
                              isTeamEvent,
                              isPosition: showAsPosition,
                              teamNames,
                              participantNames,
                            })}
                          </td>
                          <td className="px-4 py-2.5 text-center text-text-muted">–</td>
                          <td className="px-4 py-2.5 font-medium text-text">
                            {matchSeriesSideLabel(s, 1, {
                              isTeamEvent,
                              isPosition: showAsPosition,
                              teamNames,
                              participantNames,
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
          {isLeague && scheduleDraft.position_round_game && !sections.some((s) => s.isPosition) && (
            <p className="text-xs text-text-muted">
              Position round is set on game {scheduleDraft.position_round_game} in the draft —
              click <span className="font-medium text-text">Generate from league schedule</span>{' '}
              to rebuild shells for that week.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default FormatMatchupsPanel;
