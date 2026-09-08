import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  RoundMatchSeriesAPI,
} from '../../../api/round-match-series';
import { RoundsAPI } from '../../../api/rounds';
import { getErrorMessage } from '../../../api/apiErrors';
import type { RoundRead } from '../../../types/round';
import { AdvancementMethod } from '../../../types/roundRelationship';
import Alert from '../../common/Alert';
import Button from '../../common/Button';
import Loading from '../../common/Loading';
import SideActionReportPreviewModal from '../../side_actions/reports/SideActionReportPreviewModal';
import { buildEventStepladderReportDocument } from '../../event-reports/buildEventStepladderReportDocument';
import type { ReportDocument } from '../../../utils/sideActionReportPrint';
import { invalidateEventFlowStructureQueries } from '../flow/RoundFlowManagement';
import { matchSeriesSideLabel } from '../../../utils/matchSeriesSideLabel';
import { useFormatEditorMatchupQueries } from '../../../hooks/useFormatEditorMatchupQueries';
import { allowsStandingsBasedSeeding } from './openingRoundSeeding';
import SeedSourceRoundSelect from './SeedSourceRoundSelect';
import {
  normalizeSeedSourceRoundId,
  seedSourceFromConfig,
  seedSourceToPatch,
  type SeedSourceConfig,
} from './seedSourceRound';

interface HeadToHeadMatchupsHomeProps {
  eventId: number;
  round: RoundRead;
  isTeamEvent: boolean;
  tournamentName?: string | null;
  eventName?: string | null;
}

/**
 * Thin matchup home for bracket / stepladder / pods.
 * Generate or sync shells here; score entry and slot swaps stay on Game Scoring.
 */
const HeadToHeadMatchupsHome: React.FC<HeadToHeadMatchupsHomeProps> = ({
  eventId,
  round,
  isTeamEvent,
  tournamentName,
  eventName,
}) => {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<ReportDocument | null>(null);
  const [seedSourceDraft, setSeedSourceDraft] = useState<SeedSourceConfig>(() =>
    seedSourceFromConfig(
      (round.competition_method_config || {}) as Record<string, unknown>
    )
  );

  const method = String(round.competition_method || '').toLowerCase();
  const isStepladder = method === AdvancementMethod.STEPLADDER || method === 'stepladder';
  const methodLabel = method.replace(/_/g, ' ') || 'match play';

  const { seriesQuery, readinessQuery, participantsQuery, teamsQuery } =
    useFormatEditorMatchupQueries(eventId, round.id, isTeamEvent);

  const allowStandingsSeeding = allowsStandingsBasedSeeding({
    isInitialRound: readinessQuery.data?.is_initial_round,
  });

  useEffect(() => {
    setSeedSourceDraft(
      seedSourceFromConfig(
        (round.competition_method_config || {}) as Record<string, unknown>
      )
    );
  }, [round.id, round.updated_at, round.competition_method_config]);

  const persistSeedSource = useCallback(async () => {
    const prev = (round.competition_method_config || {}) as Record<string, unknown>;
    const current = seedSourceFromConfig(prev);
    const sameMode = current.seed_source_mode === seedSourceDraft.seed_source_mode;
    const sameRound =
      normalizeSeedSourceRoundId(current.seed_source_round_id) ===
      normalizeSeedSourceRoundId(seedSourceDraft.seed_source_round_id);
    if (sameMode && sameRound) return;
    await RoundsAPI.updateRound(round.id, {
      competition_method_config: seedSourceToPatch(
        seedSourceDraft,
        prev
      ) as RoundRead['competition_method_config'],
    });
    await queryClient.invalidateQueries({ queryKey: ['round', round.id] });
  }, [queryClient, round.competition_method_config, round.id, seedSourceDraft]);

  const matchSeries = useMemo(() => {
    const rows = seriesQuery.data?.match_series ?? [];
    return [...rows].sort((a, b) => a.display_order - b.display_order);
  }, [seriesQuery.data?.match_series]);

  const seedIds = useMemo(() => {
    if (isTeamEvent) {
      return (teamsQuery.data || [])
        .map((t) => Number(t.id))
        .filter((id) => id > 0)
        .sort((a, b) => a - b);
    }
    return (participantsQuery.data || [])
      .map((p) => Number(p.event_participant_id))
      .filter((id) => id > 0)
      .sort((a, b) => a - b);
  }, [isTeamEvent, teamsQuery.data, participantsQuery.data]);

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['roundMatchSeries', round.id] });
    await queryClient.invalidateQueries({ queryKey: ['matchStructureReadiness', round.id] });
    invalidateEventFlowStructureQueries(queryClient, eventId);
  };

  const syncMutation = useMutation({
    mutationFn: async () => {
      await persistSeedSource();
      return RoundMatchSeriesAPI.syncMatchStructure(round.id);
    },
    onSuccess: async () => {
      setError(null);
      setSuccess('Match structure synced.');
      await invalidate();
    },
    onError: (err) => setError(getErrorMessage(err, 'Could not sync match structure.')),
  });

  const generateStepladderMutation = useMutation({
    mutationFn: async () => {
      if (seedIds.length < 2) {
        throw new Error('Need at least two seeds (roster or teams) to generate a stepladder.');
      }
      await persistSeedSource();
      const cfg = (round.competition_method_config || {}) as Record<string, unknown>;
      const race = Math.max(1, Number(cfg.race_to_wins) || 1);
      const maxG = Math.max(1, Number(cfg.max_games ?? cfg.game_count) || race * 2 - 1 || 1);
      return RoundMatchSeriesAPI.generateStepladder(round.id, {
        ordered_seeds: seedIds,
        race_to_wins: race,
        max_games: maxG,
        is_teams: isTeamEvent,
      });
    },
    onSuccess: async (res) => {
      setError(null);
      setSuccess(`Generated ${res.created} stepladder match(es).`);
      await invalidate();
    },
    onError: (err) => setError(getErrorMessage(err, 'Could not generate stepladder.')),
  });

  const busy =
    syncMutation.isPending ||
    generateStepladderMutation.isPending ||
    seriesQuery.isLoading;

  const canGenerate =
    readinessQuery.data?.ready === true ||
    (readinessQuery.isError ? false : matchSeries.length === 0);

  return (
    <>
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-text capitalize">{methodLabel} matchups</h3>
          <p className="mt-1 text-sm text-text-muted">
            Generate or sync match shells here. Edit scores and swap bracket slots on the{' '}
            <span className="font-medium text-text">Game Scoring</span> tab.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isStepladder && (
            <Button
              type="button"
              variant="darkbackground"
              disabled={busy || seedIds.length < 2}
              onClick={() => {
                setSuccess(null);
                generateStepladderMutation.mutate();
              }}
            >
              {generateStepladderMutation.isPending ? 'Generating…' : 'Generate stepladder'}
            </Button>
          )}
          {isStepladder && matchSeries.length > 0 && (
            <Button
              type="button"
              variant="lightbackground"
              disabled={busy}
              onClick={() =>
                setPreviewDoc(
                  buildEventStepladderReportDocument({
                    matchSeries,
                    isTeamEvent,
                    teams: teamsQuery.data,
                    participants: participantsQuery.data,
                    tournamentName,
                    eventName,
                    roundName: round.friendly_name || `Round ${round.round_number}`,
                  })
                )
              }
            >
              Print stepladder
            </Button>
          )}
          <Button
            type="button"
            variant="lightbackground"
            disabled={busy || (readinessQuery.data && !canGenerate && matchSeries.length === 0)}
            onClick={() => {
              setSuccess(null);
              syncMutation.mutate();
            }}
          >
            {syncMutation.isPending ? 'Syncing…' : 'Sync structure'}
          </Button>
        </div>
      </div>

      {actionBanner(error, success, setError, setSuccess)}

      {allowStandingsSeeding ? (
        <div className="rounded-lg border border-border bg-surface p-4">
          <SeedSourceRoundSelect
            eventId={eventId}
            currentRoundId={round.id}
            value={seedSourceDraft}
            onChange={setSeedSourceDraft}
          />
        </div>
      ) : null}

      {readinessQuery.data && !readinessQuery.data.ready && matchSeries.length === 0 && (
        <Alert variant="warning" message={readinessQuery.data.message} />
      )}

      {seriesQuery.isLoading ? (
        <Loading />
      ) : matchSeries.length === 0 ? (
        <p className="rounded-lg border border-border bg-surface p-4 text-sm text-text-muted">
          No match shells yet.
          {isStepladder
            ? ' Use Generate stepladder once the field is set, or Sync after advancement.'
            : ' Sync structure once the round roster / prior round is ready.'}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-surface-light text-xs uppercase tracking-wide text-text-muted">
              <tr>
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">Match</th>
                <th className="px-3 py-2">Side A</th>
                <th className="px-3 py-2">Side B</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {matchSeries.map((s, idx) => (
                <tr key={s.id} className="border-t border-border/60">
                  <td className="px-3 py-2 text-text-muted">{idx + 1}</td>
                  <td className="px-3 py-2 font-medium text-text">
                    {s.match_label || `Match ${s.id}`}
                  </td>
                  <td className="px-3 py-2">{matchSeriesSideLabel(s, 0, { isTeamEvent })}</td>
                  <td className="px-3 py-2">{matchSeriesSideLabel(s, 1, { isTeamEvent })}</td>
                  <td className="px-3 py-2 capitalize text-text-muted">{s.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
    <SideActionReportPreviewModal
      isOpen={previewDoc != null}
      onClose={() => setPreviewDoc(null)}
      document={previewDoc}
    />
    </>
  );
};

function actionBanner(
  error: string | null,
  success: string | null,
  setError: (v: string | null) => void,
  setSuccess: (v: string | null) => void
) {
  return (
    <>
      {error && <Alert variant="error" message={error} onDismiss={() => setError(null)} />}
      {success && (
        <Alert variant="success" message={success} onDismiss={() => setSuccess(null)} />
      )}
    </>
  );
}

export default HeadToHeadMatchupsHome;
