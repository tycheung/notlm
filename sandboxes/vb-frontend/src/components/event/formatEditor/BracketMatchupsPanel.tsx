import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { RoundsAPI } from '../../../api/rounds';
import { RoundMatchSeriesAPI } from '../../../api/round-match-series';
import { getErrorMessage } from '../../../api/apiErrors';
import type { RoundRead } from '../../../types/round';
import Alert from '../../common/Alert';
import Button from '../../common/Button';
import Loading from '../../common/Loading';
import BracketSeedSettings from './BracketSeedSettings';
import {
  groupBracketSeries,
  seedConfigFromRound,
  seedConfigToPatch,
  type BracketSeedConfig,
} from './bracketMatchupsUtils';
import {
  allowsStandingsBasedSeeding,
  coerceBracketSeedModeForOpening,
} from './openingRoundSeeding';
import { pickRoundGameScoring } from '../../../utils/roundGameScoring';
import { matchSeriesSideLabel } from '../../../utils/matchSeriesSideLabel';
import { invalidateEventFlowStructureQueries } from '../flow/RoundFlowManagement';
import { useFormatEditorMatchupQueries } from '../../../hooks/useFormatEditorMatchupQueries';
import EventBracketViewerModal from './EventBracketViewerModal';
import SideActionReportPreviewModal from '../../side_actions/reports/SideActionReportPreviewModal';
import { buildEventBracketReportDocument } from '../../event-reports/buildEventBracketReportDocument';
import type { ReportDocument } from '../../../utils/sideActionReportPrint';

interface BracketMatchupsPanelProps {
  eventId: number;
  round: RoundRead;
  isTeamEvent: boolean;
  onConfigSaved?: () => void;
  tournamentName?: string | null;
  eventName?: string | null;
}

/**
 * Format Editor Matchups for brackets: seed mode + generate/sync, preview by round.
 */
const BracketMatchupsPanel: React.FC<BracketMatchupsPanelProps> = ({
  eventId,
  round,
  isTeamEvent,
  onConfigSaved,
  tournamentName,
  eventName,
}) => {
  const queryClient = useQueryClient();

  const [seedDraft, setSeedDraft] = useState<BracketSeedConfig>(() =>
    seedConfigFromRound(round)
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<ReportDocument | null>(null);

  useEffect(() => {
    setSeedDraft(seedConfigFromRound(round));
  }, [round.id, round.updated_at]);

  const { seriesQuery, readinessQuery, teamsQuery, participantsQuery } =
    useFormatEditorMatchupQueries(eventId, round.id, isTeamEvent);

  const allowStandingsSeeding = allowsStandingsBasedSeeding({
    isInitialRound: readinessQuery.data?.is_initial_round,
  });

  useEffect(() => {
    if (readinessQuery.isLoading || readinessQuery.isError) return;
    setSeedDraft((prev) => {
      const nextMode = coerceBracketSeedModeForOpening(prev.seed_mode, allowStandingsSeeding);
      return nextMode === prev.seed_mode ? prev : { ...prev, seed_mode: nextMode };
    });
  }, [allowStandingsSeeding, readinessQuery.isError, readinessQuery.isLoading]);

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
  const sections = useMemo(() => groupBracketSeries(matchSeries), [matchSeries]);

  const scoring = pickRoundGameScoring(
    (round.competition_method_config || {}) as Record<string, unknown>
  );
  const bakerBadge = scoring.game_style === 'baker';

  const updateSeedDraft = useCallback((patch: Partial<BracketSeedConfig>) => {
    setSeedDraft((prev) => ({ ...prev, ...patch }));
    setActionSuccess(null);
  }, []);

  const saveAndSyncMutation = useMutation({
    mutationFn: async (opts: { sync: boolean }) => {
      const prevCfg = (round.competition_method_config || {}) as Record<string, unknown>;
      const safeDraft: BracketSeedConfig = {
        ...seedDraft,
        seed_mode: coerceBracketSeedModeForOpening(seedDraft.seed_mode, allowStandingsSeeding),
      };
      const nextCfg = seedConfigToPatch(safeDraft, prevCfg);
      await RoundsAPI.updateRound(round.id, {
        competition_method_config: nextCfg as RoundRead['competition_method_config'],
      });
      if (opts.sync) {
        // Force rebuild so seed_mode / field-size changes replace shells (bye
        // auto-completes set wins and would otherwise block a soft sync).
        await RoundMatchSeriesAPI.syncMatchStructure(round.id, { forceRebuild: true });
      }
    },
    onSuccess: async (_data, vars) => {
      setActionError(null);
      const mode = seedDraft.seed_mode;
      setActionSuccess(
        vars.sync
          ? mode === 'manual'
            ? 'Settings saved; bracket shells generated (sides left open for manual assign).'
            : 'Settings saved and bracket regenerated.'
          : 'Bracket settings saved.'
      );
      await queryClient.invalidateQueries({ queryKey: ['roundMatchSeries', round.id] });
      await queryClient.invalidateQueries({ queryKey: ['matchStructureReadiness', round.id] });
      await queryClient.invalidateQueries({ queryKey: ['round', round.id] });
      invalidateEventFlowStructureQueries(queryClient, eventId);
      onConfigSaved?.();
    },
    onError: (err) => {
      setActionError(getErrorMessage(err, 'Could not update bracket matchups.'));
    },
  });

  const busy = saveAndSyncMutation.isPending;
  const readiness = readinessQuery.data;
  const canGenerate = readiness?.ready === true;
  const readinessMessage =
    readiness && !readiness.ready
      ? readiness.message
      : readinessQuery.isError
        ? getErrorMessage(readinessQuery.error, 'Could not check matchup readiness.')
        : null;

  const generateLabel =
    seedDraft.seed_mode === 'manual'
      ? 'Generate shells (manual fill)'
      : seedDraft.seed_mode === 'random'
        ? 'Generate randomized bracket'
        : 'Generate seeded bracket';

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
            Choose seeding, then generate the bracket. Opening round uses roster or
            advancement order; later rounds wait until prior rounds finish. Swap sides on{' '}
            <span className="font-medium text-text">Game Scoring</span>.
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
            {busy && saveAndSyncMutation.isPending ? 'Saving…' : 'Save settings'}
          </Button>
          <Button
            type="button"
            size="small"
            variant="primary"
            disabled={busy || readinessQuery.isLoading || !canGenerate}
            title={readinessMessage || undefined}
            onClick={() => saveAndSyncMutation.mutate({ sync: true })}
          >
            {busy && saveAndSyncMutation.isPending ? 'Generating…' : generateLabel}
          </Button>
          {matchSeries.length > 0 ? (
            <>
              <Button
                type="button"
                size="small"
                variant="lightbackground"
                disabled={busy}
                onClick={() => setViewerOpen(true)}
              >
                View bracket
              </Button>
              <Button
                type="button"
                size="small"
                variant="lightbackground"
                disabled={busy}
                onClick={() =>
                  setPreviewDoc(
                    buildEventBracketReportDocument({
                      matchSeries,
                      isTeamEvent,
                      bracketMode: seedDraft.bracket_mode,
                      teams: teamsQuery.data,
                      participants: participantsQuery.data,
                      tournamentName,
                      eventName,
                      roundName: round.friendly_name || `Round ${round.round_number}`,
                    })
                  )
                }
              >
                Print bracket
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {readinessMessage && <Alert variant="warning" message={readinessMessage} />}
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
        <BracketSeedSettings
          methodConfig={seedDraft}
          onChange={updateSeedDraft}
          compact
          allowStandingsBasedSeeding={allowStandingsSeeding}
          eventId={eventId}
          currentRoundId={round.id}
        />
        {seedDraft.seed_mode === 'manual' ? (
          <p className="text-xs text-text-muted">
            Manual mode creates the traditional seed chart with empty sides (seed ranks
            shown). Assign entrants on Game Scoring after generate.
          </p>
        ) : null}
      </div>

      {seriesQuery.isLoading ? (
        <Loading size="medium" />
      ) : sections.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-surface-light/30 px-4 py-10 text-center">
          <p className="text-sm text-text-muted">
            No bracket shells yet. Choose a seeding mode and click{' '}
            <span className="font-medium text-text">{generateLabel}</span>.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-text-muted">
            {sections.length} round{sections.length === 1 ? '' : 's'}
            {` · ${matchSeries.length} matches`}
            {` · ${seedDraft.seed_mode.replace(/_/g, ' ')}`}
          </p>
          {sections.map((section) => (
            <div
              key={section.key}
              className="overflow-hidden rounded-lg border border-border bg-surface"
            >
              <div className="border-b border-border bg-surface-light/50 px-4 py-2.5">
                <div className="font-medium text-text">{section.title}</div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-xs uppercase tracking-wide text-text-muted">
                    <tr>
                      <th className="px-4 py-2 font-medium w-16">#</th>
                      <th className="px-4 py-2 font-medium">Side A</th>
                      <th className="px-4 py-2 font-medium w-10 text-center">vs</th>
                      <th className="px-4 py-2 font-medium">Side B</th>
                      <th className="px-4 py-2 font-medium">Status</th>
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
                            teamNames,
                            participantNames,
                          })}
                        </td>
                        <td className="px-4 py-2.5 text-center text-text-muted">–</td>
                        <td className="px-4 py-2.5 font-medium text-text">
                          {matchSeriesSideLabel(s, 1, {
                            isTeamEvent,
                            teamNames,
                            participantNames,
                          })}
                        </td>
                        <td className="px-4 py-2.5 capitalize text-text-muted">{s.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      <EventBracketViewerModal
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
        roundName={round.friendly_name || `Round ${round.round_number}`}
        tournamentName={tournamentName}
        eventName={eventName}
        matchSeries={matchSeries}
        isTeamEvent={isTeamEvent}
        bracketMode={seedDraft.bracket_mode}
        teams={teamsQuery.data}
        participants={participantsQuery.data}
      />
      <SideActionReportPreviewModal
        isOpen={previewDoc != null}
        onClose={() => setPreviewDoc(null)}
        document={previewDoc}
      />
    </div>
  );
};

export default BracketMatchupsPanel;
