import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  eventLaneBoardQueryKey,
  flattenLaneBoardRows,
  useApplyLaneAssignments,
  useAutoBatchLanes,
  useCopyLanesFromRound,
  useEventLaneBoard,
  useEventLaneManagement,
  useStampLaneGames,
  useUpdateLaneEngine,
  type LaneOccupancyMode,
  type LaneAssignmentMode,
  type LanePair,
} from '../../features/lanes';
import { usePersistedRoundSelection } from '../../features/rounds/usePersistedRoundSelection';
import { EventFormat } from '../../types/event';
import PairsInPlayEditor from './PairsInPlayEditor';
import MovementConfigEditor from './MovementConfigEditor';
import SquadPairsOverrideEditor from './SquadPairsOverrideEditor';
import { buildLaneMovementScheduleReportDocument } from './buildLaneMovementScheduleReportDocument';
import { buildAssignmentPreviewFromRows } from './buildLaneAssignmentPreviewReportDocument';
import SideActionReportPreviewModal from '../side_actions/reports/SideActionReportPreviewModal';
import LaneAssignmentPreviewModal from './LaneAssignmentPreviewModal';
import LaneBoardGrid from './LaneBoardGrid';
import Label from '../common/Label';
import Alert from '../common/Alert';
import type { LaneMovementConfig } from '../../features/lanes/types';
import type { ReportDocument } from '../../utils/sideActionReportPrint';
import type { LaneAssignmentPreview } from '../../features/lanes/buildLaneAssignmentPreview';

const defaultMovement: LaneMovementConfig = {
  enabled: false,
  interval_games: 1,
  mode: 'stay',
  step_pairs: 1,
  staggered_steps: [],
  league_team_count: null,
  league_wrap_pair_offset: null,
  split_house: false,
  split_after_pair_low: null,
};

const fieldClass =
  'mt-1 w-full rounded-input border border-border bg-surface-light px-3 py-2 text-sm text-text ' +
  'focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary disabled:opacity-50';

interface LaneAssignmentPanelProps {
  eventId: number;
  initialRoundId?: number | null;
  rounds?: Array<{
    id: number;
    round_number: number;
    friendly_name?: string | null;
    competition_method_config?: Record<string, unknown> | null;
  }>;
  eventFormat?: EventFormat | string | null;
  teamSize?: number | null;
  onAfterSuccessfulSave?: () => void;
}

type AutoBatchStrategy = 'random' | 'alpha' | 'entry';

function isRoundIdValid(
  roundId: number,
  rounds: Array<{ id: number }>
): boolean {
  return rounds.some((round) => round.id === roundId);
}

function isDoublesEvent(
  eventFormat?: EventFormat | string | null,
  teamSize?: number | null
): boolean {
  return eventFormat === EventFormat.TEAMS && Number(teamSize) === 2;
}

function isTeamEvent(eventFormat?: EventFormat | string | null): boolean {
  return eventFormat === EventFormat.TEAMS;
}

const LaneAssignmentPanel: React.FC<LaneAssignmentPanelProps> = ({
  eventId,
  initialRoundId = null,
  rounds = [],
  eventFormat = null,
  teamSize = null,
  onAfterSuccessfulSave,
}) => {
  const queryClient = useQueryClient();
  const { getPersistedRoundId, setPersistedRoundId, clearPersistedRoundId } =
    usePersistedRoundSelection(eventId);
  const hasInitializedRoundRef = useRef(false);
  const doublesEvent = isDoublesEvent(eventFormat, teamSize);
  const teamEvent = isTeamEvent(eventFormat);

  const [selectedRoundId, setSelectedRoundId] = useState<number | null>(initialRoundId);
  const [autoBatchStrategy, setAutoBatchStrategy] =
    useState<AutoBatchStrategy>('random');

  const [pairs, setPairs] = useState<LanePair[]>([]);
  const [occupancyMode, setOccupancyMode] = useState<LaneOccupancyMode>('single_lane');
  const [assignmentMode, setAssignmentMode] = useState<LaneAssignmentMode>('manual');
  const [evenFill, setEvenFill] = useState(true);
  const [assignmentsPublic, setAssignmentsPublic] = useState(false);
  const [maxPerLane, setMaxPerLane] = useState(1);
  const [movement, setMovement] = useState<LaneMovementConfig>(defaultMovement);
  const [selectedSquadId, setSelectedSquadId] = useState<number | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [movementReport, setMovementReport] = useState<ReportDocument | null>(null);
  const [assignmentPreview, setAssignmentPreview] = useState<LaneAssignmentPreview | null>(
    null
  );

  useEffect(() => {
    hasInitializedRoundRef.current = false;
    setSelectedRoundId(null);
  }, [eventId]);

  useEffect(() => {
    if (hasInitializedRoundRef.current) return;
    if (!rounds.length) return;

    const persistedRoundId = getPersistedRoundId();
    if (persistedRoundId != null && isRoundIdValid(persistedRoundId, rounds)) {
      setSelectedRoundId(persistedRoundId);
      hasInitializedRoundRef.current = true;
      return;
    }

    if (persistedRoundId != null) {
      clearPersistedRoundId();
    }

    const fallbackRoundId = initialRoundId ?? rounds[0]?.id ?? null;
    if (fallbackRoundId != null) {
      setSelectedRoundId(fallbackRoundId);
      hasInitializedRoundRef.current = true;
    }
  }, [
    rounds,
    initialRoundId,
    getPersistedRoundId,
    clearPersistedRoundId,
  ]);

  useEffect(() => {
    if (initialRoundId != null && !hasInitializedRoundRef.current) {
      setSelectedRoundId(initialRoundId);
    }
  }, [initialRoundId]);

  const managementQuery = useEventLaneManagement(eventId);
  const boardQuery = useEventLaneBoard(eventId, {
    roundId: selectedRoundId,
    squadId: selectedSquadId,
  });
  const saveMutation = useUpdateLaneEngine(eventId);
  const applyMutation = useApplyLaneAssignments(eventId);
  const autoBatchMutation = useAutoBatchLanes(eventId);
  const clearAssignmentsMutation = useApplyLaneAssignments(eventId);
  const stampMutation = useStampLaneGames(eventId);
  const copyFromRoundMutation = useCopyLanesFromRound(eventId);
  const [copySourceRoundId, setCopySourceRoundId] = useState<number | null>(null);

  useEffect(() => {
    const engine = managementQuery.data?.engine;
    if (!engine) return;
    setPairs((engine.pairs_in_play || []) as LanePair[]);
    const nextOccupancy = engine.occupancy_mode || 'single_lane';
    if (nextOccupancy === 'doubles_across' && !doublesEvent) {
      setOccupancyMode('single_lane');
    } else {
      setOccupancyMode(nextOccupancy);
    }
    setMaxPerLane(engine.max_per_lane || 1);
    setAssignmentMode(engine.assignment_mode || 'manual');
    setEvenFill(engine.even_fill !== false);
    setAssignmentsPublic(engine.assignments_public === true);
    setMovement({
      ...defaultMovement,
      ...(engine.movement || {}),
      staggered_steps: engine.movement?.staggered_steps || [],
      split_house: Boolean(engine.movement?.split_house),
      split_after_pair_low: engine.movement?.split_after_pair_low ?? null,
    });
  }, [managementQuery.data, doublesEvent]);

  useEffect(() => {
    if (occupancyMode === 'doubles_across' && !doublesEvent) {
      setOccupancyMode('single_lane');
      setNotice('Doubles across is only available for doubles (2-person team) events.');
    }
  }, [doublesEvent, occupancyMode]);

  const centerLaneCount = managementQuery.data?.center_lane_count ?? 0;

  const capacityLabel = useMemo(() => {
    if (occupancyMode === 'doubles_across') return 'Max teams per pair';
    if (teamEvent) return 'Max teams per lane';
    return 'Max bowlers per lane';
  }, [occupancyMode, teamEvent]);

  const rosterRows = useMemo(
    () => flattenLaneBoardRows(boardQuery.data?.lanes, boardQuery.data?.unassigned),
    [boardQuery.data?.lanes, boardQuery.data?.unassigned]
  );

  const laneOptions = useMemo(() => {
    const fromBoard = boardQuery.data?.lanes_in_play || [];
    if (fromBoard.length) return fromBoard;
    return pairs.flatMap(([a, b]) => [a, b]);
  }, [boardQuery.data?.lanes_in_play, pairs]);

  const boardHasSavedLanes = (boardQuery.data?.lanes_in_play || []).length > 0;

  const handleRoundSelectionChange = (value: string) => {
    const nextRoundId = value ? Number(value) : null;
    setSelectedRoundId(nextRoundId);
    setPersistedRoundId(nextRoundId);
  };

  const handleStampGames = async () => {
    try {
      const data = await stampMutation.mutateAsync({
        round_id: selectedRoundId ?? undefined,
        squad_id: selectedSquadId ?? undefined,
      });
      const stamped = Number(data.stamped_games ?? 0);
      const seats = Number(data.participants ?? 0);
      if (stamped === 0) {
        setBanner(null);
        setNotice(
          seats > 0
            ? `0 games stamped — no squads are locked in yet (${seats} seat(s) assigned). Lock in squads for this round to create game shells, then stamp again.`
            : '0 games stamped — no seats or locked-in game shells in this scope. Lock in squads first, then stamp.'
        );
        return;
      }
      const teamBit =
        data.team_games_stamped != null ? ` · ${data.team_games_stamped} team` : '';
      const posBit =
        data.position_games_stamped != null && data.position_games_stamped > 0
          ? ` · ${data.position_games_stamped} position`
          : '';
      setBanner(
        `Stamped ${stamped} game lane(s) for ${seats} seat(s)${teamBit}${posBit}.`
      );
      setNotice(null);
    } catch (err: unknown) {
      setNotice(err instanceof Error ? err.message : 'Failed to stamp game lanes');
    }
  };

  const handleCopyFromRound = async () => {
    const targetId = selectedRoundId ?? boardQuery.data?.round_id ?? null;
    if (copySourceRoundId == null || targetId == null) {
      setNotice('Pick a source round and a target round before copying.');
      return;
    }
    if (copySourceRoundId === targetId) {
      setNotice('Source and target rounds must be different.');
      return;
    }
    const sourceMeta = rounds.find((r) => r.id === copySourceRoundId);
    const targetMeta = rounds.find((r) => r.id === targetId);
    const ok = window.confirm(
      `Copy opening lane seats from Round ${sourceMeta?.round_number ?? copySourceRoundId}` +
        `${sourceMeta?.friendly_name ? ` (${sourceMeta.friendly_name})` : ''}` +
        ` onto Round ${targetMeta?.round_number ?? targetId}` +
        `${targetMeta?.friendly_name ? ` (${targetMeta.friendly_name})` : ''}?` +
        `\n\nUnscored game shells on the target round will be restamped (scored games keep their lanes).`
    );
    if (!ok) return;
    try {
      const data = await copyFromRoundMutation.mutateAsync({
        source_round_id: copySourceRoundId,
        target_round_id: targetId,
        stamp: true,
      });
      setBanner(
        `Copied ${data.updated_assignments} seat(s)` +
          (data.skipped_assignments
            ? ` (${data.skipped_assignments} skipped — no source match)`
            : '') +
          (data.stamp_result
            ? ` · stamped ${data.stamp_result.stamped_games} game(s)`
            : '') +
          '.'
      );
      setNotice(null);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        (err instanceof Error ? err.message : 'Failed to copy lanes');
      setNotice(typeof message === 'string' ? message : 'Failed to copy lanes');
    }
  };

  const saveEngine = async () => {
    if (occupancyMode === 'doubles_across' && !doublesEvent) {
      throw new Error('Doubles across is only available for doubles (2-person team) events.');
    }
    return saveMutation.mutateAsync({
      pairs_in_play: pairs,
      occupancy_mode: occupancyMode,
      assignment_mode: assignmentMode,
      even_fill: evenFill,
      assignments_public: assignmentsPublic,
      max_per_lane: maxPerLane,
      movement: movement.enabled
        ? {
            ...movement,
            mode: movement.mode === 'stay' ? 'move_right' : movement.mode,
          }
        : { ...movement, enabled: false, mode: 'stay' },
      propagate_to_squads: true,
    });
  };

  const handleSaveEngine = async () => {
    try {
      const data = await saveEngine();
      setBanner(
        data.squads_updated != null
          ? `Saved. Updated ${data.squads_updated} squad${data.squads_updated === 1 ? '' : 's'}.`
          : 'Saved.'
      );
      setNotice(null);
      onAfterSuccessfulSave?.();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        (err instanceof Error ? err.message : 'Failed to save lane settings');
      setNotice(typeof message === 'string' ? message : 'Failed to save lane settings');
    }
  };

  const handleApplyAssignments = async (
    assignments: Array<{ squad_participant_id: number; assigned_lane: number | null; lane_slot?: number | null }>
  ) => {
    try {
      const data = await applyMutation.mutateAsync({ assignments });
      setBanner(`Updated ${data.updated_assignments} assignment(s).`);
      const pairWarns = (data.warnings || []).filter((w) => w.code === 'REPEATED_PAIR');
      if (data.errors?.length) {
        setNotice(data.errors.map((e) => e.error).join('; '));
      } else if (pairWarns.length) {
        setNotice(pairWarns.map((w) => w.message).join(' '));
      } else {
        setNotice(null);
      }
    } catch (err: unknown) {
      setNotice(err instanceof Error ? err.message : 'Failed to apply assignments');
    }
  };

  const handleAutoBatch = async (checkedInOnly: boolean) => {
    if (!boardHasSavedLanes) {
      setNotice('Save pairs in play before running auto assign.');
      return;
    }
    try {
      const data = await autoBatchMutation.mutateAsync({
        round_id: selectedRoundId ?? boardQuery.data?.round_id ?? undefined,
        squad_id: selectedSquadId ?? undefined,
        strategy: autoBatchStrategy,
        unassigned_only: true,
        checked_in_only: checkedInOnly,
        persist: true,
      });
      const planned = data.summary.units_placed ?? data.assignments.length;
      const updated = data.apply_result?.updated_assignments;
      const applyErrors = data.apply_result?.errors || [];
      const overflowCount = data.overflow_units?.length ?? 0;

      if (planned === 0 && overflowCount === 0) {
        setBanner(null);
        setNotice(
          data.summary.checked_in_only
            ? 'No checked-in unassigned bowlers to place in this scope.'
            : 'No unassigned bowlers to place in this scope.'
        );
      } else if (planned === 0 && overflowCount > 0) {
        setBanner(null);
        setNotice(
          `${overflowCount} could not be placed (over capacity). Assign manually or add pairs.`
        );
      } else if (data.persisted && updated === 0) {
        setBanner(null);
        setNotice(
          applyErrors.length
            ? applyErrors.map((e) => e.error).join('; ')
            : `Planned ${planned} assignment(s) but none were saved.`
        );
      } else {
        const count = updated ?? planned;
        setBanner(`Auto-assigned ${count} unit(s).`);
        if (overflowCount > 0) {
          setNotice(
            `${overflowCount} could not be placed (over capacity). Assign manually or add pairs.`
          );
        } else if (applyErrors.length) {
          setNotice(applyErrors.map((e) => e.error).join('; '));
        } else {
          setNotice(null);
        }
      }
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        (err instanceof Error ? err.message : 'Auto assign failed');
      setNotice(typeof message === 'string' ? message : 'Auto assign failed');
    }
  };

  const handleClearAssignments = async () => {
    const assigned = rosterRows.filter((row) => row.assigned_lane != null);
    if (!assigned.length) {
      setNotice('No assignments to remove.');
      return;
    }
    try {
      const data = await clearAssignmentsMutation.mutateAsync({
        assignments: assigned.map((row) => ({
          squad_participant_id: row.squad_participant_id,
          assigned_lane: null,
        })),
      });
      setBanner(`Removed ${data.updated_assignments} assignment(s).`);
      if (data.errors?.length) {
        setNotice(data.errors.map((e) => e.error).join('; '));
      } else {
        setNotice(null);
      }
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        (err instanceof Error ? err.message : 'Failed to remove assignments');
      setNotice(typeof message === 'string' ? message : 'Failed to remove assignments');
    }
  };

  const showRoundSelector = rounds.length > 1;

  const selectedSquad = useMemo(
    () => (boardQuery.data?.squads || []).find((s) => s.id === selectedSquadId) ?? null,
    [boardQuery.data?.squads, selectedSquadId]
  );

  const squadGameCount = useMemo(() => {
    if (selectedSquad?.game_count && selectedSquad.game_count > 0) {
      return selectedSquad.game_count;
    }
    const fromSquads = (boardQuery.data?.squads || [])
      .map((s) => s.game_count || 0)
      .filter((n) => n > 0);
    if (fromSquads.length) {
      return Math.max(...fromSquads);
    }
    return 3;
  }, [boardQuery.data?.squads, selectedSquad]);

  const canSave =
    !saveMutation.isPending &&
    pairs.length > 0 &&
    !(occupancyMode === 'doubles_across' && !doublesEvent);

  const openMovementScheduleReport = () => {
    if (pairs.length < 1) {
      setNotice('Set pairs in play before generating the lane movement schedule.');
      return;
    }
    const report = buildLaneMovementScheduleReportDocument({
      pairs,
      gameCount: squadGameCount,
      movement,
      squadLabel: selectedSquad?.name ?? null,
    });
    setMovementReport(report);
  };

  const openAssignmentPreview = () => {
    if (pairs.length < 1) {
      setNotice('Set pairs in play before previewing assignments.');
      return;
    }
    const seated = rosterRows.filter((row) => row.assigned_lane != null);
    if (!seated.length) {
      setNotice('Assign teams to opening lanes first, then preview all games.');
      return;
    }
    const selectedRoundMeta =
      rounds.find((r) => r.id === (selectedRoundId ?? boardQuery.data?.round_id)) ??
      null;
    const cfg = (selectedRoundMeta?.competition_method_config || {}) as Record<
      string,
      unknown
    >;
    const rawPosGame = cfg.position_round_game;
    const positionGame =
      rawPosGame != null && Number(rawPosGame) >= 1 ? Number(rawPosGame) : null;
    const teamCount =
      movement.league_team_count ??
      Math.max(seated.length, pairs.length * 2);
    setAssignmentPreview(
      buildAssignmentPreviewFromRows({
        pairs,
        gameCount: squadGameCount,
        movement,
        rows: rosterRows,
        positionRound:
          positionGame != null
            ? {
                game: positionGame,
                placement: String(cfg.position_round_lane_placement ?? 'start_low'),
                teamCount,
                roundId: selectedRoundMeta?.id ?? selectedRoundId,
              }
            : null,
      })
    );
  };

  return (
    <div className="space-y-6 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-text">Lane Assignments</h2>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="px-4 py-2 rounded-input border border-border bg-surface-light hover:bg-surface disabled:opacity-50 text-sm"
            disabled={pairs.length < 1}
            onClick={openAssignmentPreview}
          >
            Preview assignments
          </button>
          <button
            type="button"
            className="px-4 py-2 rounded-input border border-border bg-surface-light hover:bg-surface disabled:opacity-50 text-sm"
            disabled={pairs.length < 1}
            onClick={openMovementScheduleReport}
          >
            Lane movement schedule (PDF)
          </button>
        </div>
      </div>

      <LaneAssignmentPreviewModal
        isOpen={Boolean(assignmentPreview)}
        onClose={() => setAssignmentPreview(null)}
        preview={assignmentPreview}
        movement={movement}
        squadLabel={selectedSquad?.name ?? null}
      />

      <SideActionReportPreviewModal
        isOpen={Boolean(movementReport)}
        onClose={() => setMovementReport(null)}
        document={movementReport}
      />

      {banner && (
        <Alert variant="success" message={banner} onDismiss={() => setBanner(null)} />
      )}
      {notice && (
        <Alert variant="warning" message={notice} onDismiss={() => setNotice(null)} />
      )}

      <section className="space-y-4 border-b border-border pb-6">
        <h3 className="text-lg font-medium text-text">Pairs in play</h3>
        {managementQuery.isLoading ? (
          <p className="text-sm text-text-muted">Loading…</p>
        ) : centerLaneCount < 2 ? (
          <p className="text-sm text-text-muted">
            Set a bowling center lane count of at least 2 before choosing pairs.
          </p>
        ) : (
          <PairsInPlayEditor
            centerLaneCount={centerLaneCount}
            pairs={pairs}
            onChange={setPairs}
            disabled={saveMutation.isPending}
          />
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teamEvent ? (
            <div>
              <Label htmlFor="occupancy-mode">Team occupancy</Label>
              <select
                id="occupancy-mode"
                className={fieldClass}
                value={occupancyMode}
                onChange={(e) => {
                  const next = e.target.value as LaneOccupancyMode;
                  if (next === 'doubles_across' && !doublesEvent) {
                    setNotice(
                      'Doubles across is only available for doubles (2-person team) events.'
                    );
                    setOccupancyMode('single_lane');
                    return;
                  }
                  setNotice(null);
                  setOccupancyMode(next);
                }}
              >
                <option value="single_lane">Entire team on one lane</option>
                <option value="doubles_across" disabled={!doublesEvent}>
                  Doubles partners across a pair
                </option>
              </select>
              {!doublesEvent ? (
                <p className="mt-1 text-xs text-text-muted">
                  Doubles across requires a 2-person team event.
                </p>
              ) : null}
            </div>
          ) : null}

          <div>
            <Label htmlFor="max-per-lane">{capacityLabel}</Label>
            <input
              id="max-per-lane"
              type="number"
              min={1}
              max={13}
              className={fieldClass}
              value={maxPerLane}
              onChange={(e) => setMaxPerLane(Math.max(1, Number(e.target.value) || 1))}
            />
            <p className="mt-1 text-xs text-text-muted">
              Letters fill left then right of each pair (e.g. max 3 → left A–C, right D–F).
            </p>
          </div>

          <div>
            <Label htmlFor="assignment-mode">Assignment mode</Label>
            <select
              id="assignment-mode"
              className={fieldClass}
              value={assignmentMode}
              onChange={(e) => setAssignmentMode(e.target.value as LaneAssignmentMode)}
            >
              <option value="manual">Manual</option>
              <option value="auto_batch">Auto-assign all bowlers</option>
              <option value="auto_checkin">Auto-assign during check-in</option>
            </select>
            {assignmentMode === 'auto_checkin' ? (
              <p className="mt-1 text-xs text-text-muted">
                Lanes assign automatically when bowlers are checked in from Participant Management.
              </p>
            ) : null}
          </div>

          {assignmentMode === 'auto_batch' || assignmentMode === 'auto_checkin' ? (
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm text-text">
                <input
                  type="checkbox"
                  checked={evenFill}
                  onChange={(e) => setEvenFill(e.target.checked)}
                  className="rounded border-border"
                />
                Even fill across pairs
              </label>
            </div>
          ) : null}

          <div className="sm:col-span-2 lg:col-span-3">
            <label htmlFor="assignments-public" className="flex items-start gap-2 text-sm text-text">
              <input
                id="assignments-public"
                type="checkbox"
                checked={assignmentsPublic}
                onChange={(e) => setAssignmentsPublic(e.target.checked)}
                className="mt-0.5 rounded border-border"
              />
              <span>
                <span className="font-medium">Make Public</span>
                <span className="block text-xs text-text-muted mt-0.5">
                  When off, bowlers always see “not assigned” for lane and pair — even after you
                  finish assigning. Turn on when you want assignments visible without check-in.
                </span>
              </span>
            </label>
          </div>
        </div>

        <MovementConfigEditor
          movement={movement}
          onChange={setMovement}
          numPairs={pairs.length}
          lanesInPlay={laneOptions}
          pairsInPlay={pairs}
          gameCount={squadGameCount}
          disabled={saveMutation.isPending}
        />

        <button
          type="button"
          className="px-4 py-2 rounded-input bg-primary text-white hover:opacity-90 disabled:opacity-50"
          disabled={!canSave}
          onClick={() => void handleSaveEngine()}
        >
          {saveMutation.isPending ? 'Saving…' : 'Save & copy to squads'}
        </button>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h3 className="text-lg font-medium text-text">Assignments</h3>
          <div className="flex flex-wrap gap-3">
            {showRoundSelector ? (
              <div>
                <Label htmlFor="board-round">Round</Label>
                <select
                  id="board-round"
                  className={fieldClass}
                  value={selectedRoundId ?? ''}
                  onChange={(e) => handleRoundSelectionChange(e.target.value)}
                >
                  {rounds.map((round) => (
                    <option key={round.id} value={round.id}>
                      Round {round.round_number}
                      {round.friendly_name ? `: ${round.friendly_name}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            {showRoundSelector ? (
              <div>
                <Label htmlFor="copy-source-round">Copy seats from</Label>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <select
                    id="copy-source-round"
                    className={fieldClass + ' mt-0 min-w-[10rem]'}
                    value={copySourceRoundId ?? ''}
                    onChange={(e) =>
                      setCopySourceRoundId(e.target.value ? Number(e.target.value) : null)
                    }
                  >
                    <option value="">Select source…</option>
                    {rounds
                      .filter((r) => r.id !== selectedRoundId)
                      .map((round) => (
                        <option key={round.id} value={round.id}>
                          Round {round.round_number}
                          {round.friendly_name ? `: ${round.friendly_name}` : ''}
                        </option>
                      ))}
                  </select>
                  <button
                    type="button"
                    className="px-3 py-2 rounded-input border border-border bg-surface-light hover:bg-surface disabled:opacity-50 text-sm"
                    disabled={
                      copyFromRoundMutation.isPending ||
                      copySourceRoundId == null ||
                      selectedRoundId == null
                    }
                    onClick={() => void handleCopyFromRound()}
                  >
                    {copyFromRoundMutation.isPending ? 'Copying…' : 'Copy onto this round'}
                  </button>
                </div>
              </div>
            ) : null}
            <button
              type="button"
              className="px-4 py-2 rounded-input border border-border bg-surface-light hover:bg-surface disabled:opacity-50 text-sm self-end"
              disabled={
                stampMutation.isPending ||
                boardQuery.isLoading ||
                !rosterRows.some((row) => row.assigned_lane != null)
              }
              title="Project opening lanes + movement onto unscored game shells (preserves position-round and scored games)"
              onClick={() => void handleStampGames()}
            >
              {stampMutation.isPending ? 'Stamping…' : 'Stamp game lanes'}
            </button>
            {assignmentMode === 'auto_batch' ? (
              <>
                <div>
                  <Label htmlFor="auto-batch-strategy">Auto-assign strategy</Label>
                  <select
                    id="auto-batch-strategy"
                    className={fieldClass}
                    value={autoBatchStrategy}
                    onChange={(e) =>
                      setAutoBatchStrategy(e.target.value as AutoBatchStrategy)
                    }
                  >
                    <option value="random">Random</option>
                    <option value="alpha">Alphabetical</option>
                    <option value="entry">Entry order</option>
                  </select>
                </div>
                <button
                  type="button"
                  className="px-4 py-2 rounded-input bg-primary text-white hover:opacity-90 disabled:opacity-50"
                  disabled={
                    autoBatchMutation.isPending ||
                    clearAssignmentsMutation.isPending ||
                    boardQuery.isLoading ||
                    !boardHasSavedLanes
                  }
                  title={
                    boardHasSavedLanes
                      ? undefined
                      : 'Save pairs in play before running auto assign'
                  }
                  onClick={() => {
                    const unassigned = rosterRows.filter((row) => row.assigned_lane == null);
                    const notCheckedIn = unassigned.filter((row) => !row.checked_in);
                    let checkedInOnly = false;
                    if (notCheckedIn.length > 0) {
                      const assignUnchecked = window.confirm(
                        'Assign bowlers who have not checked in?'
                      );
                      checkedInOnly = !assignUnchecked;
                    }
                    void handleAutoBatch(checkedInOnly);
                  }}
                >
                  {autoBatchMutation.isPending ? 'Assigning…' : 'Auto assign unassigned'}
                </button>
              </>
            ) : null}
            <button
              type="button"
              className="px-4 py-2 rounded-input border border-border bg-surface-light hover:bg-surface disabled:opacity-50 text-sm"
              disabled={
                clearAssignmentsMutation.isPending ||
                autoBatchMutation.isPending ||
                boardQuery.isLoading ||
                !rosterRows.some((row) => row.assigned_lane != null)
              }
              onClick={() => {
                if (
                  !window.confirm(
                    'Remove all lane assignments for the bowlers shown below?'
                  )
                ) {
                  return;
                }
                void handleClearAssignments();
              }}
            >
              {clearAssignmentsMutation.isPending
                ? 'Removing…'
                : 'Remove all assignments'}
            </button>
            <div>
              <Label htmlFor="board-squad">Squad</Label>
              <select
                id="board-squad"
                className={fieldClass}
                value={selectedSquadId ?? ''}
                onChange={(e) =>
                  setSelectedSquadId(e.target.value ? Number(e.target.value) : null)
                }
              >
                <option value="">All squads in round</option>
                {(boardQuery.data?.squads || []).map((squad) => (
                  <option key={squad.id} value={squad.id}>
                    {squad.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {selectedSquadId && selectedSquad ? (
          <SquadPairsOverrideEditor
            eventId={eventId}
            squadId={selectedSquadId}
            squadName={selectedSquad.name}
            centerLaneCount={centerLaneCount}
            eventPairs={(managementQuery.data?.engine.pairs_in_play || []) as LanePair[]}
            squadPairs={(boardQuery.data?.pairs_in_play || []) as LanePair[]}
            pairSource={boardQuery.data?.pair_source}
            disabled={boardQuery.isLoading}
            onSaved={async () => {
              await queryClient.invalidateQueries({
                queryKey: eventLaneBoardQueryKey(eventId, selectedRoundId, selectedSquadId),
              });
              setBanner('Squad pairs updated.');
            }}
          />
        ) : null}

        {boardQuery.isLoading ? (
          <p className="text-sm text-text-muted">Loading board…</p>
        ) : (
          <>
            {(boardQuery.data?.warnings || []).length > 0 && (
              <ul className="text-sm space-y-1">
                {boardQuery.data?.warnings.map((warning, idx) => (
                  <li
                    key={`${warning.code}-${idx}`}
                    className={
                      warning.code === 'REPEATED_PAIR'
                        ? 'text-warning'
                        : 'text-text-muted'
                    }
                  >
                    {warning.message}
                  </li>
                ))}
              </ul>
            )}

            <LaneBoardGrid
              lanes={boardQuery.data?.lanes}
              unassigned={boardQuery.data?.unassigned}
              maxPerLane={boardQuery.data?.max_per_lane ?? maxPerLane}
              teamSeats={teamEvent && occupancyMode === 'single_lane'}
              disabled={applyMutation.isPending || boardQuery.isLoading}
              onApplyAssignments={(assignments) => void handleApplyAssignments(assignments)}
            />
          </>
        )}
      </section>
    </div>
  );
};

export default LaneAssignmentPanel;
