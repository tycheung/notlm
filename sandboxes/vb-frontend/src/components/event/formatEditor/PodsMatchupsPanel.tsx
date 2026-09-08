import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { RoundsAPI } from '../../../api/rounds';
import { RoundMatchSeriesAPI } from '../../../api/round-match-series';
import { getErrorMessage } from '../../../api/apiErrors';
import type { RoundRead } from '../../../types/round';
import Alert from '../../common/Alert';
import Button from '../../common/Button';
import Loading from '../../common/Loading';
import { invalidateEventFlowStructureQueries } from '../flow/RoundFlowManagement';
import { useFormatEditorMatchupQueries } from '../../../hooks/useFormatEditorMatchupQueries';
import { pickRoundGameScoring } from '../../../utils/roundGameScoring';
import PodsSizeAdvanceSettings from './PodsSizeAdvanceSettings';
import {
  assignPods,
  computePodSizes,
  podsConfigFromRound,
  podsConfigToPatch,
  type PodsDeskConfig,
} from './podsMatchupsUtils';
import PodsMatchupsPreview from './PodsMatchupsPreview';
import { buildPodsMembershipPreview } from '../../../utils/podsScoringGroups';
import {
  allowsStandingsBasedSeeding,
  coercePodsBalanceModeForOpening,
} from './openingRoundSeeding';
import {
  countSquadRosterParticipants,
  countSquadRosterTeams,
  resolveFormatEditorEntrantCount,
} from '../../../utils/formatEditorEntrantCount';

interface PodsMatchupsPanelProps {
  eventId: number;
  round: RoundRead;
  isTeamEvent: boolean;
  onConfigSaved?: () => void;
  tournamentName?: string | null;
  eventName?: string | null;
}

const PodsMatchupsPanel: React.FC<PodsMatchupsPanelProps> = ({
  eventId,
  round,
  isTeamEvent,
  onConfigSaved,
  tournamentName,
  eventName,
}) => {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<PodsDeskConfig>(() =>
    podsConfigFromRound((round.competition_method_config || {}) as Record<string, unknown>)
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [manualText, setManualText] = useState('');

  useEffect(() => {
    const next = podsConfigFromRound(
      (round.competition_method_config || {}) as Record<string, unknown>
    );
    setDraft(next);
    if (next.pod_membership?.length) {
      setManualText(next.pod_membership.map((pod) => pod.join(', ')).join('\n'));
    }
  }, [round.id, round.updated_at]);

  const { readinessQuery, teamsQuery, participantsQuery, squadRosterQuery, squadTeamsQuery } =
    useFormatEditorMatchupQueries(eventId, round.id, isTeamEvent);

  const allowStandingsSeeding = allowsStandingsBasedSeeding({
    isInitialRound: readinessQuery.data?.is_initial_round,
  });

  useEffect(() => {
    if (readinessQuery.isLoading || readinessQuery.isError) return;
    setDraft((prev) => {
      const nextMode = coercePodsBalanceModeForOpening(
        prev.balance_mode,
        allowStandingsSeeding
      );
      return nextMode === prev.balance_mode ? prev : { ...prev, balance_mode: nextMode };
    });
  }, [allowStandingsSeeding, readinessQuery.isError, readinessQuery.isLoading]);

  const entrantCount = useMemo(
    () =>
      resolveFormatEditorEntrantCount({
        isTeamEvent,
        isInitialRound: readinessQuery.data?.is_initial_round === true,
        standingsParticipants: participantsQuery.data || [],
        eventTeamsCount: (teamsQuery.data || []).length,
        squadRosterParticipants: countSquadRosterParticipants(squadRosterQuery.data),
        squadRosterTeams: countSquadRosterTeams(squadTeamsQuery.data),
        poolCount: Number(readinessQuery.data?.pool_count ?? 0),
      }),
    [
      isTeamEvent,
      participantsQuery.data,
      readinessQuery.data?.is_initial_round,
      readinessQuery.data?.pool_count,
      squadRosterQuery.data,
      squadTeamsQuery.data,
      teamsQuery.data,
    ]
  );

  const squadRosterCount = isTeamEvent
    ? countSquadRosterTeams(squadTeamsQuery.data)
    : countSquadRosterParticipants(squadRosterQuery.data);
  const poolCount = Number(readinessQuery.data?.pool_count ?? 0);
  const isInitialRound = readinessQuery.data?.is_initial_round === true;

  const squadParticipantsForPreview = useMemo(() => {
    if (isTeamEvent) {
      return (squadTeamsQuery.data?.squads ?? []).flatMap((squad) =>
        (squad.teams ?? []).map((team) => ({
          id: team.id,
          team_id: team.id,
          display_name: team.display_name || team.team_name,
          team_name: team.team_name,
          round_entry_number: team.round_entry_number,
        }))
      );
    }
    return (squadRosterQuery.data?.squads ?? []).flatMap((squad) => squad.participants ?? []);
  }, [isTeamEvent, squadRosterQuery.data, squadTeamsQuery.data]);

  const podPreview = useMemo(
    () =>
      buildPodsMembershipPreview({
        squadParticipants: squadParticipantsForPreview as Record<string, unknown>[],
        roundParticipants: (participantsQuery.data ?? []) as Record<string, unknown>[],
        podMembership: draft.pod_membership,
        advanceBySize: draft.advance_by_size,
        isTeamEvent,
      }),
    [
      draft.advance_by_size,
      draft.pod_membership,
      isTeamEvent,
      participantsQuery.data,
      squadParticipantsForPreview,
    ]
  );

  const unitLabel = isTeamEvent ? 'team' : 'bowler';
  const roundDisplayName =
    round.friendly_name?.trim() || `Round ${round.round_number ?? round.id}`;

  const scoring = pickRoundGameScoring(
    (round.competition_method_config || {}) as Record<string, unknown>
  );
  const bakerBadge = scoring.game_style === 'baker';

  const previewSizes = useMemo(() => {
    if (entrantCount < 2) return [] as number[];
    try {
      return computePodSizes(
        entrantCount,
        draft.pod_size_min,
        draft.pod_size_max,
        draft.remainder_mode,
        draft.preferred_pod_size
      );
    } catch {
      return [];
    }
  }, [draft.pod_size_max, draft.pod_size_min, draft.preferred_pod_size, draft.remainder_mode, entrantCount]);

  const updateDraft = useCallback((patch: Partial<PodsDeskConfig>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
    setActionSuccess(null);
  }, []);

  const parseManualMembership = (): number[][] | null => {
    const lines = manualText
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (!lines.length) return null;
    return lines.map((line) =>
      line
        .split(/[,\s]+/)
        .map((tok) => parseInt(tok, 10))
        .filter((n) => Number.isFinite(n) && n > 0)
    );
  };

  const saveAndSyncMutation = useMutation({
    mutationFn: async (opts: { sync: boolean }) => {
      const prevCfg = (round.competition_method_config || {}) as Record<string, unknown>;
      const safeBalance = coercePodsBalanceModeForOpening(
        draft.balance_mode,
        allowStandingsSeeding
      );
      let membership = draft.pod_membership ?? null;
      if (safeBalance === 'manual') {
        membership = parseManualMembership();
      } else if (opts.sync && entrantCount >= 2 && previewSizes.length) {
        const seeds = Array.from({ length: entrantCount }, (_, i) => i + 1);
        membership = assignPods(seeds, previewSizes, safeBalance, membership);
      }
      const nextDraft: PodsDeskConfig = {
        ...draft,
        balance_mode: safeBalance,
        pod_membership: membership,
      };
      const nextCfg = podsConfigToPatch(nextDraft, prevCfg);
      await RoundsAPI.updateRound(round.id, {
        competition_method_config: nextCfg as RoundRead['competition_method_config'],
      });
      if (opts.sync) {
        await RoundMatchSeriesAPI.syncMatchStructure(round.id, { forceRebuild: true });
      }
      return nextDraft;
    },
    onSuccess: async (nextDraft) => {
      setActionError(null);
      setDraft(nextDraft);
      if (nextDraft.pod_membership?.length) {
        setManualText(nextDraft.pod_membership.map((pod) => pod.join(', ')).join('\n'));
      }
      setActionSuccess(
        nextDraft ? 'Pods settings saved and match structure generated.' : 'Saved.'
      );
      await queryClient.invalidateQueries({ queryKey: ['round', round.id] });
      await queryClient.invalidateQueries({ queryKey: ['eventRounds', eventId] });
      await queryClient.invalidateQueries({ queryKey: ['roundMatchSeries', round.id] });
      await queryClient.invalidateQueries({
        queryKey: ['matchStructureReadiness', round.id],
      });
      await queryClient.invalidateQueries({ queryKey: ['roundSquadParticipants', round.id] });
      await queryClient.invalidateQueries({ queryKey: ['roundSquadTeams', round.id] });
      invalidateEventFlowStructureQueries(queryClient, eventId);
      onConfigSaved?.();
    },
    onError: (err) => {
      setActionError(getErrorMessage(err, 'Could not save pods settings.'));
    },
  });

  if (readinessQuery.isLoading) {
    return <Loading />;
  }

  return (
    <div className="space-y-4">
      {bakerBadge && isTeamEvent ? (
        <p className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-text">
          Baker pods: each team bowls one Baker score per game; pinfall cuts still apply within
          each pod.
        </p>
      ) : null}

      {actionError ? <Alert variant="error" message={actionError} /> : null}
      {actionSuccess ? <Alert variant="success" message={actionSuccess} /> : null}

      {!isInitialRound && poolCount > 0 && squadRosterCount === 0 ? (
        <Alert
          variant="warning"
          message={`${poolCount} advancer${poolCount === 1 ? '' : 's'} are in the advancement pool but not assigned to a squad yet. Open the Squads tab, move them into a squad, lock the squad, then return here and click Generate pods.`}
        />
      ) : null}

      {!isInitialRound && squadRosterCount > 0 && entrantCount >= 2 ? (
        <Alert
          variant="info"
          message={
            round.locked_in
              ? `${squadRosterCount} entrant${squadRosterCount === 1 ? '' : 's'} on locked squads. Click Generate pods to build pod rosters for scoring.`
              : `${squadRosterCount} entrant${squadRosterCount === 1 ? '' : 's'} assigned to squads. Lock the squad on the Squads tab, then Generate pods to build pod rosters for scoring.`
          }
        />
      ) : null}

      {readinessQuery.data && !readinessQuery.data.ready && readinessQuery.data.message ? (
        <Alert variant="warning" message={readinessQuery.data.message} />
      ) : null}

      <PodsSizeAdvanceSettings
        draft={draft}
        onChange={updateDraft}
        entrantCountHint={entrantCount}
        allowStandingsBasedSeeding={allowStandingsSeeding}
        eventId={eventId}
        currentRoundId={round.id}
      />

      {previewSizes.length > 0 ? (
        <p className="text-xs text-text-muted">
          Planned mix for {entrantCount} entrants:{' '}
          {previewSizes.map((s, i) => `Pod ${i + 1}=${s}`).join(' · ')}
        </p>
      ) : null}

      {draft.balance_mode === 'manual' ? (
        <div>
          <label className="text-sm font-semibold text-text" htmlFor="pods-manual-membership">
            Manual membership (1-based seeds, one pod per line)
          </label>
          <textarea
            id="pods-manual-membership"
            className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 font-mono text-sm text-text"
            rows={Math.max(3, previewSizes.length || 3)}
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            placeholder={'1, 4, 7, 10\n2, 5, 8, 11\n3, 6, 9, 12'}
          />
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          disabled={saveAndSyncMutation.isPending}
          onClick={() => saveAndSyncMutation.mutate({ sync: false })}
        >
          Save settings
        </Button>
        <Button
          type="button"
          disabled={
            saveAndSyncMutation.isPending ||
            entrantCount < 2 ||
            (!isInitialRound && squadRosterCount < 2) ||
            (!isInitialRound && squadRosterCount > 0 && !round.locked_in)
          }
          onClick={() => saveAndSyncMutation.mutate({ sync: true })}
        >
          {saveAndSyncMutation.isPending ? 'Working…' : 'Generate pods'}
        </Button>
      </div>

      <PodsMatchupsPreview
        podPreview={podPreview}
        draft={draft}
        isTeamEvent={isTeamEvent}
        unitLabel={unitLabel}
        roundDisplayName={roundDisplayName}
        tournamentName={tournamentName}
        eventName={eventName}
        busy={saveAndSyncMutation.isPending}
      />
    </div>
  );
};

export default PodsMatchupsPanel;
