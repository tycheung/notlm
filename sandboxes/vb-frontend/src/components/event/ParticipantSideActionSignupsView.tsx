import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  SideActionsAPI,
  type RosterSideActionColumn,
  type RosterSideActionPoolColumn,
  type RosterSideActionSignupRow,
  type RosterSideActionSignupsData,
  type RosterSideActionSignupUpdate,
} from '../../api/side-actions';
import { getErrorMessage } from '../../api/apiErrors';
import Loading from '../common/Loading';
import Alert from '../common/Alert';
import Input from '../common/Input';
import TableSearchInput from '../common/TableSearchInput';
import DualHorizontalScrollTable from '../common/DualHorizontalScrollTable';
import {
  billableEntryCount,
  computeRosterRowOwed,
  isFullyPaid,
  parseSignupQuantityInput,
  parseTotalPaidInput,
  rosterDisplayedQuantity,
} from './rosterSignupUtils';
import { applyOptimisticRosterSignupUpdate, formatRosterSignupSaveError } from './rosterSignupOptimistic';
import {
  buildRosterDisplayRows,
  compareRosterSignupRows,
  isTeamPotSeatHolder,
  signupCellMode,
  teamMemberHasAll,
  teamMemberQuantitySum,
  teamPoolCellForColumn,
  teamPotQuantityForBowler,
  type RosterSignupSortBy,
} from './rosterDisplayRows';
import {
  focusAdjacentRosterInput,
  qtyDraftKey,
  selectAllOnFocus,
} from './rosterSignupDom';
import { sideActionQueryKeys } from '../../features/side-actions/shared';
import RosterRolloverControl, {
  eligibleBracketSetsForSquad,
} from './RosterRolloverControl';
import { formatQualifyingAverage } from './teamScoringHelpers';

function columnsForSelectedSquad(
  columns: RosterSideActionColumn[],
  squadId: number | null
): RosterSideActionColumn[] {
  if (squadId == null) return columns;
  return columns
    .map((col) => ({
      ...col,
      pools: col.pools.filter((pool) => pool.squad_id === squadId),
    }))
    .filter((col) => col.pools.length > 0);
}

interface ParticipantSideActionSignupsViewProps {
  tournamentId: number;
  eventId: number;
}

const isFullyPaidRow = isFullyPaid;

const ParticipantSideActionSignupsView: React.FC<ParticipantSideActionSignupsViewProps> = ({
  tournamentId,
  eventId,
}) => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSquadId, setSelectedSquadId] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<RosterSignupSortBy>('last_name');
  const [groupByTeam, setGroupByTeam] = useState(false);
  const [draftPaid, setDraftPaid] = useState<Record<number, string>>({});
  const [draftQty, setDraftQty] = useState<Record<string, string>>({});
  const [editingQtyKey, setEditingQtyKey] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const editingQtyRef = useRef<Set<string>>(new Set());
  const editingPaidRef = useRef<Set<number>>(new Set());
  const mutationVersionRef = useRef(0);
  const pendingMutationsRef = useRef(0);

  const rosterQueryKey = sideActionQueryKeys.rosterSignups(tournamentId, eventId);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: rosterQueryKey,
    queryFn: () => SideActionsAPI.getRosterSignups(tournamentId, eventId),
    enabled: tournamentId > 0 && eventId > 0,
  });

  useEffect(() => {
    if (!data?.rows) return;
    const nextPaid: Record<number, string> = {};
    for (const row of data.rows) {
      if (!editingPaidRef.current.has(row.user_id)) {
        nextPaid[row.user_id] = row.total_paid.toFixed(2);
      }
    }
    setDraftPaid((previous) => ({ ...previous, ...nextPaid }));

    const columns = data.side_actions ?? [];
    setDraftQty((prev) => {
      const next = { ...prev };
      for (const row of data.rows) {
        for (const col of columns) {
          const cell = row.signups[String(col.side_action_id)];
          for (const pool of col.pools) {
            const key = qtyDraftKey(
              row.user_id,
              col.side_action_id,
              pool.pool_id
            );
            if (editingQtyRef.current.has(key)) continue;
            if (col.entry_unit === 'team') {
              // Personal tickets only in draft — team totals show when Group by team.
              next[key] = String(teamPotQuantityForBowler(row, col, pool));
            } else {
              const poolCell = cell?.pools.find(
                (candidate) => candidate.pool_id === pool.pool_id
              );
              next[key] = String(rosterDisplayedQuantity(poolCell));
            }
          }
        }
      }
      return next;
    });
  }, [data?.rows, data?.side_actions]);

  const saveMutation = useMutation({
    mutationFn: (request: RosterSideActionSignupUpdate) =>
      SideActionsAPI.updateRosterSignup(request),
    onMutate: async (request) => {
      const version = ++mutationVersionRef.current;
      pendingMutationsRef.current += 1;
      await queryClient.cancelQueries({ queryKey: rosterQueryKey });
      const previous =
        queryClient.getQueryData<RosterSideActionSignupsData>(rosterQueryKey);
      if (previous) {
        queryClient.setQueryData(
          rosterQueryKey,
          applyOptimisticRosterSignupUpdate(previous, request)
        );
      }
      setActionError(null);
      return { previous, version };
    },
    onError: (err, request, context) => {
      if (
        context?.previous &&
        context.version === mutationVersionRef.current
      ) {
        queryClient.setQueryData(rosterQueryKey, context.previous);
      }
      if (context?.version === mutationVersionRef.current) {
        const roster =
          context.previous ??
          queryClient.getQueryData<RosterSideActionSignupsData>(rosterQueryKey);
        setActionError(formatRosterSignupSaveError(err, request, roster));
      }
    },
    onSuccess: (result, _request, context) => {
      if (context?.version === mutationVersionRef.current) {
        queryClient.setQueryData(rosterQueryKey, result);
        setActionError(null);
      }
    },
    onSettled: () => {
      pendingMutationsRef.current = Math.max(0, pendingMutationsRef.current - 1);
      if (pendingMutationsRef.current > 0) return;
      void queryClient.invalidateQueries({ queryKey: rosterQueryKey });
      void queryClient.invalidateQueries({
        queryKey: sideActionQueryKeys.all,
        predicate: (query) =>
          (query.queryKey as readonly unknown[])[1] !== 'roster-signups',
      });
    },
  });

  const filteredRows = useMemo(() => {
    const rows = data?.rows ?? [];
    const q = searchQuery.trim().toLowerCase();
    const filtered = q
      ? rows.filter((row) => {
          const hay = [
            row.name,
            row.email ?? '',
            row.usbc_id ?? '',
            row.team_name ?? '',
          ]
            .join(' ')
            .toLowerCase();
          return hay.includes(q);
        })
      : rows;
    return [...filtered].sort((a, b) => compareRosterSignupRows(a, b, sortBy));
  }, [data?.rows, searchQuery, sortBy]);

  const squadOptions = useMemo(() => {
    const byId = new Map<number, string>();
    for (const col of data?.side_actions ?? []) {
      for (const pool of col.pools) {
        if (pool.squad_id != null && pool.squad_id > 0) {
          byId.set(
            pool.squad_id,
            pool.squad_name?.trim() || `Squad ${pool.squad_id}`
          );
        }
      }
    }
    return [...byId.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [data?.side_actions]);

  const showSquadFilter = squadOptions.length > 1;

  // Always pin to a squad when SA pools exist — signups are squad-scoped.
  useEffect(() => {
    if (squadOptions.length === 0) {
      setSelectedSquadId(null);
      return;
    }
    if (
      selectedSquadId == null ||
      !squadOptions.some((option) => option.id === selectedSquadId)
    ) {
      setSelectedSquadId(squadOptions[0].id);
    }
  }, [squadOptions, selectedSquadId]);

  const squadFilteredRows = useMemo(() => {
    if (selectedSquadId == null) return filteredRows;
    return filteredRows.filter((row) =>
      (row.squad_ids ?? []).includes(selectedSquadId)
    );
  }, [filteredRows, selectedSquadId]);

  const visibleColumns = useMemo(
    () => columnsForSelectedSquad(data?.side_actions ?? [], selectedSquadId),
    [data?.side_actions, selectedSquadId]
  );

  const selectedSquadName =
    squadOptions.find((option) => option.id === selectedSquadId)?.name ?? null;

  const anyBowlerAssignedToSelectedSquad = useMemo(() => {
    if (selectedSquadId == null) return true;
    return (data?.rows ?? []).some((row) =>
      (row.squad_ids ?? []).includes(selectedSquadId)
    );
  }, [data?.rows, selectedSquadId]);

  const hasTeamPots = useMemo(
    () => (data?.side_actions ?? []).some((col) => col.entry_unit === 'team'),
    [data?.side_actions]
  );

  const hasTeamsOnRoster = useMemo(
    () => (data?.rows ?? []).some((row) => row.team_id != null),
    [data?.rows]
  );

  const displayRows = useMemo(
    () =>
      buildRosterDisplayRows(squadFilteredRows, visibleColumns, {
        groupByTeam,
        nestTeamMembers: hasTeamPots,
        sortBy,
      }),
    [visibleColumns, squadFilteredRows, groupByTeam, hasTeamPots, sortBy]
  );

  const updateQuantity = useCallback(
    (
      row: RosterSideActionSignupRow,
      column: RosterSideActionColumn,
      pool: RosterSideActionPoolColumn,
      nextQty: number
    ) => {
      saveMutation.mutate({
        tournament_id: tournamentId,
        event_id: eventId,
        user_id: row.user_id,
        side_action_id: column.side_action_id,
        pool_id: pool.pool_id,
        // Typing a number clears All on the backend.
        quantity: Math.max(0, Math.min(nextQty, pool.max_entries_per_user)),
        is_all: false,
      });
    },
    [eventId, saveMutation, tournamentId]
  );

  const setBracketAll = useCallback(
    (
      row: RosterSideActionSignupRow,
      column: RosterSideActionColumn,
      pool: RosterSideActionPoolColumn
    ) => {
      saveMutation.mutate({
        tournament_id: tournamentId,
        event_id: eventId,
        user_id: row.user_id,
        side_action_id: column.side_action_id,
        pool_id: pool.pool_id,
        is_all: true,
      });
    },
    [eventId, saveMutation, tournamentId]
  );

  const setSquadRollover = useCallback(
    (
      row: RosterSideActionSignupRow,
      squadId: number,
      enabled: boolean,
      targetIds: number[]
    ) => {
      saveMutation.mutate({
        tournament_id: tournamentId,
        event_id: eventId,
        user_id: row.user_id,
        squad_id: squadId,
        rollover_enabled: enabled,
        rollover_target_side_action_ids: enabled ? targetIds : [],
      });
    },
    [eventId, saveMutation, tournamentId]
  );

  const enrollAllSidepots = useCallback(
    (row: RosterSideActionSignupRow) => {
      saveMutation.mutate({
        tournament_id: tournamentId,
        event_id: eventId,
        user_id: row.user_id,
        enroll_all_eligible_sidepots: true,
      });
    },
    [eventId, saveMutation, tournamentId]
  );

  const commitQuantity = useCallback(
    (
      row: RosterSideActionSignupRow,
      column: RosterSideActionColumn,
      pool: RosterSideActionPoolColumn,
      serverQty: number,
      isAll = false
    ) => {
      const key = qtyDraftKey(
        row.user_id,
        column.side_action_id,
        pool.pool_id
      );
      const parsed = parseSignupQuantityInput(
        draftQty[key] ?? String(serverQty),
        serverQty,
        pool.max_entries_per_user,
        { isAll }
      );
      if (parsed.error) {
        setActionError(parsed.error);
        setDraftQty((prev) => ({ ...prev, [key]: String(serverQty) }));
        return;
      }
      setDraftQty((prev) => ({ ...prev, [key]: String(parsed.value) }));
      if (parsed.shouldPersist) {
        updateQuantity(row, column, pool, parsed.value);
      }
    },
    [draftQty, updateQuantity]
  );

  const updateEnrolled = useCallback(
    (
      row: RosterSideActionSignupRow,
      column: RosterSideActionColumn,
      pool: RosterSideActionPoolColumn,
      enrolled: boolean
    ) => {
      saveMutation.mutate({
        tournament_id: tournamentId,
        event_id: eventId,
        user_id: row.user_id,
        side_action_id: column.side_action_id,
        pool_id: pool.pool_id,
        enrolled,
      });
    },
    [eventId, saveMutation, tournamentId]
  );

  const commitTotalPaid = useCallback(
    (row: RosterSideActionSignupRow) => {
      const raw = draftPaid[row.user_id] ?? '0';
      const { amount, error } = parseTotalPaidInput(raw);
      if (error) {
        setActionError(error);
        return;
      }
      saveMutation.mutate({
        tournament_id: tournamentId,
        event_id: eventId,
        user_id: row.user_id,
        total_paid: amount,
      });
    },
    [draftPaid, eventId, saveMutation, tournamentId]
  );

  const markFullyPaid = useCallback(
    (row: RosterSideActionSignupRow) => {
      const owed = row.total_owed;
      if (owed <= 0) return;
      const owedStr = owed.toFixed(2);
      setDraftPaid((prev) => ({ ...prev, [row.user_id]: owedStr }));
      if (!isFullyPaidRow(row.total_owed, row.total_paid)) {
        saveMutation.mutate({
          tournament_id: tournamentId,
          event_id: eventId,
          user_id: row.user_id,
          total_paid: owed,
        });
      }
    },
    [eventId, saveMutation, tournamentId]
  );

  const markTeamFullyPaid = useCallback(
    (members: RosterSideActionSignupRow[]) => {
      for (const member of members) {
        if (member.total_owed > 0 && !isFullyPaidRow(member.total_owed, member.total_paid)) {
          markFullyPaid(member);
        }
      }
    },
    [markFullyPaid]
  );

  if (isLoading) {
    return <Loading />;
  }

  if (isError) {
    return (
      <Alert variant="error" message={getErrorMessage(error, 'Failed to load side action signups.')} />
    );
  }

  const columns = visibleColumns;
  const bracketColumns = columns.filter(
    (col) => col.side_action_type.toLowerCase() === 'bracket'
  );
  const sidepotColumns = columns.filter(
    (col) => col.side_action_type.toLowerCase() !== 'bracket'
  );
  const showAllSidepotsColumn = sidepotColumns.some((col) =>
    col.side_action_type.toLowerCase() !== 'alibi_doubles' &&
    col.pools.some((pool) => pool.input_type === 'checkbox')
  );

  const stickyHeaderClass =
    'sticky top-0 z-[15] bg-primary shadow-[0_1px_0_0_rgba(0,0,0,0.35)]';

  const renderPoolHeaders = (cols: RosterSideActionColumn[]) =>
    cols.flatMap((col) =>
      col.pools.map((pool) => (
        <th
          key={`${col.side_action_id}:${pool.pool_id}`}
          className={`px-3 py-3 text-left text-xs font-semibold text-text uppercase tracking-wider min-w-[140px] ${stickyHeaderClass}`}
          title={`$${pool.entry_fee.toFixed(2)} per entry`}
        >
          <div className="flex flex-wrap items-center gap-1">
            <span>{col.name}</span>
            {col.entry_unit === 'team' ? (
              <span className="rounded border border-white/40 px-1 py-0.5 text-[9px] font-semibold tracking-wide">
                Team
              </span>
            ) : null}
          </div>
          <div className="text-[10px] font-normal normal-case opacity-80">
            {pool.squad_name} · ${pool.entry_fee.toFixed(2)}
          </div>
        </th>
      ))
    );

  return (
    <div className="space-y-4">
      {actionError && (
        <Alert variant="error" message={actionError} onDismiss={() => setActionError(null)} />
      )}

      {columns.length === 0 && (
        <Alert
          variant="warning"
          message="No side actions are open yet. Create them on the Side Action tab first."
        />
      )}

      <p className="text-sm text-text-muted">
        Each side action is split into squad columns. Bracket qty is a ticket count;
        use All for maximum pots (estimate updates until generate). Use Roll on a
        bowler’s tickets to send leftovers into other bracket sets you pick.
        All Sidepots checks eligible single-entry pots only. Alibi Doubles pair
        tickets are read-only here — add pairs from Side Actions → Pairs.
        Columns marked Team take entries on the team line only — scores are the
        sum of that team’s members for the games this pot uses. Individual pots
        take entries on each bowler line. Tab / Enter move between cells.
      </p>

      <div className="flex flex-wrap items-center gap-4">
        <TableSearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search by name, team, USBC ID, or email"
          className="max-w-xl"
        />
        {showSquadFilter && (
          <label className="flex flex-col gap-1 text-sm text-text min-w-[10rem]">
            <span className="font-medium">Squad</span>
            <select
              aria-label="Filter signups by squad"
              className="min-h-11 rounded-md border border-border bg-surface px-3 py-2 text-sm text-text"
              value={selectedSquadId ?? ''}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === '') return;
                setSelectedSquadId(Number(raw));
              }}
              required
            >
              {squadOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="flex flex-col gap-1 text-sm text-text min-w-[10rem]">
          <span className="font-medium">Sort</span>
          <select
            aria-label="Sort participants"
            className="min-h-11 rounded-md border border-border bg-surface px-3 py-2 text-sm text-text"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as RosterSignupSortBy)}
          >
            <option value="last_name">Last name</option>
            <option value="first_name">First name</option>
            <option value="team_name">Team name</option>
          </select>
        </label>
        {!hasTeamPots && (hasTeamsOnRoster || groupByTeam) && (
          <label className="flex items-center gap-2 text-sm text-text">
            <input
              type="checkbox"
              checked={groupByTeam}
              onChange={(e) => {
                setGroupByTeam(e.target.checked);
              }}
            />
            <span>
              Group by team
              <span className="block text-xs text-text-muted">
                Collapse members into one row. Individual pots show member totals
                (ungroup to edit those).
              </span>
            </span>
          </label>
        )}
      </div>

      {displayRows.length === 0 ? (
        <p className="text-center text-text-muted py-8 text-sm">
          {searchQuery.trim()
            ? 'No roster bowlers match your filters.'
            : selectedSquadId != null && !anyBowlerAssignedToSelectedSquad
              ? `No bowlers are assigned to ${
                  selectedSquadName ?? 'this squad'
                } yet. Assign bowlers to squads before signing them up for side actions.`
              : selectedSquadId != null
                ? 'No roster bowlers match your filters.'
                : 'No approved participants on the roster yet.'}
        </p>
      ) : (
        <div className="bg-surface rounded-lg shadow overflow-hidden">
          <DualHorizontalScrollTable
            stickyTop
            bodyMaxHeight="calc(100dvh - 14rem)"
          >
            <table className="table-auto w-full min-w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr>
                  <th
                    className={`px-4 py-3 text-left text-xs font-semibold text-text uppercase tracking-wider sticky left-0 top-0 z-30 min-w-[200px] bg-primary shadow-[0_1px_0_0_rgba(0,0,0,0.35)]`}
                  >
                    {hasTeamPots || groupByTeam ? 'Team / Participant' : 'Participant'}
                  </th>
                  {renderPoolHeaders(bracketColumns)}
                  {showAllSidepotsColumn && (
                    <th
                      className={`px-3 py-3 text-left text-xs font-semibold text-text uppercase tracking-wider min-w-[100px] ${stickyHeaderClass}`}
                    >
                      All Sidepots
                    </th>
                  )}
                  {renderPoolHeaders(sidepotColumns)}
                  <th
                    className={`px-3 py-3 text-left text-xs font-semibold text-text uppercase tracking-wider min-w-[100px] ${stickyHeaderClass}`}
                  >
                    Total owed
                  </th>
                  <th
                    className={`px-3 py-3 text-left text-xs font-semibold text-text uppercase tracking-wider min-w-[160px] ${stickyHeaderClass}`}
                  >
                    Total paid
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayRows.map((display, rowIdx) => {
                  const isTeamRow = display.kind === 'team';
                  const actorRow = isTeamRow ? display.primary : display.row;
                  const labelName = isTeamRow ? display.teamName : display.row.name;
                  const columns = data?.side_actions ?? [];
                  // Derive owed from qty × fee (and the cell being edited) so Total
                  // owed tracks entry edits without requiring a full page refresh.
                  const owed = isTeamRow
                    ? (() => {
                        let teamOwed = 0;
                        for (const col of columns) {
                          const isTeamPotCol = col.entry_unit === 'team';
                          if (hasTeamPots && !isTeamPotCol) continue;
                          for (const pool of col.pools) {
                            if (!isTeamPotCol) {
                              for (const member of display.members) {
                                const poolCell = member.signups[
                                  String(col.side_action_id)
                                ]?.pools.find((p) => p.pool_id === pool.pool_id);
                                teamOwed +=
                                  billableEntryCount(poolCell) *
                                  Number(pool.entry_fee || 0);
                              }
                              continue;
                            }
                              // Team-row input is the team ticket count — prefer draft.
                              const draftKey = qtyDraftKey(
                                display.primary.user_id,
                                col.side_action_id,
                                pool.pool_id
                              );
                              const raw = draftQty[draftKey];
                              const teamQty = teamMemberQuantitySum(
                                display,
                                col,
                                pool
                              );
                              let existingBillable = 0;
                              for (const member of display.members) {
                                const poolCell = member.signups[
                                  String(col.side_action_id)
                                ]?.pools.find((p) => p.pool_id === pool.pool_id);
                                existingBillable += billableEntryCount(poolCell);
                              }
                              const draftMatchesEstimate =
                                raw == null ||
                                raw.trim() === '' ||
                                parseInt(raw, 10) === teamQty;
                              const stillAllIntent =
                                teamMemberHasAll(display.members, col, pool) &&
                                existingBillable === 0 &&
                                draftMatchesEstimate;
                              if (stillAllIntent) {
                                // All intent is not billed until generate.
                                continue;
                              }
                              if (raw != null && raw.trim() !== '') {
                                const parsed = parseInt(raw, 10);
                                if (!Number.isNaN(parsed) && parsed >= 0) {
                                  teamOwed +=
                                    parsed * Number(pool.entry_fee || 0);
                                  continue;
                                }
                              }
                              teamOwed +=
                                existingBillable * Number(pool.entry_fee || 0);
                          }
                        }
                        return Math.round(teamOwed * 100) / 100;
                      })()
                    : computeRosterRowOwed(display.row, columns, {
                        draftQty,
                        editingDraftKeys: editingQtyRef.current,
                        draftKeyFor: qtyDraftKey,
                        includeEntryUnits: hasTeamPots ? 'bowler' : 'all',
                      });
                  const paid = isTeamRow ? display.totalPaid : display.row.total_paid;

                  const renderPoolCells = (cols: RosterSideActionColumn[]) =>
                    cols.flatMap((col) =>
                      col.pools.map((pool) => {
                        const isTeamPot = col.entry_unit === 'team';
                        const isBracket = col.side_action_type.toLowerCase() === 'bracket';
                        const isAlibi =
                          col.side_action_type.toLowerCase() === 'alibi_doubles';
                        const cellMode = signupCellMode(
                          isTeamRow ? 'team' : 'bowler',
                          col.entry_unit
                        );

                        if (cellMode === 'blank') {
                          if (!hasTeamPots && isTeamRow && !isTeamPot) {
                            const sum = teamMemberQuantitySum(display, col, pool);
                            return (
                              <td
                                key={`${col.side_action_id}:${pool.pool_id}`}
                                className="px-3 py-2 text-text-muted"
                                title="Individual pot — ungroup by team to edit"
                              >
                                {sum > 0 ? sum : '—'}
                              </td>
                            );
                          }
                          return (
                            <td
                              key={`${col.side_action_id}:${pool.pool_id}`}
                              className="px-3 py-2 text-text-muted"
                              title={
                                isTeamPot
                                  ? 'Team pot — enter on the team line'
                                  : 'Individual pot — enter on the bowler line'
                              }
                            >
                              —
                            </td>
                          );
                        }

                        const poolCell = isTeamRow
                          ? teamPoolCellForColumn(display, col, pool)
                          : display.row.signups[String(col.side_action_id)]?.pools.find(
                              (candidate) => candidate.pool_id === pool.pool_id
                            );
                        // Team-grouped rows: whole-team ticket count (incl. leftovers).
                        // Ungrouped bowler rows: this bowler's tickets only so teammates
                        // are not painted as personally enrolled in team pots.
                        const qty = isTeamPot
                          ? isTeamRow
                            ? teamMemberQuantitySum(display, col, pool)
                            : teamPotQuantityForBowler(display.row, col, pool)
                          : rosterDisplayedQuantity(poolCell);
                        const isAll = isTeamPot
                          ? isTeamRow
                            ? teamMemberHasAll(display.members, col, pool)
                            : Boolean(poolCell?.is_all)
                          : Boolean(poolCell?.is_all);
                        const draftKey = qtyDraftKey(
                          actorRow.user_id,
                          col.side_action_id,
                          pool.pool_id
                        );
                        const teamCheckboxChecked = isTeamPot
                          ? isTeamRow
                            ? qty > 0 || Boolean(poolCell?.team_has_entry)
                            : isTeamPotSeatHolder(display.row, col, pool)
                          : qty > 0;
                        const isEligible = Boolean(poolCell?.is_eligible);

                        return (
                          <td
                            key={`${col.side_action_id}:${pool.pool_id}`}
                            className="px-3 py-2"
                            title={
                              isEligible
                                ? undefined
                                : 'Not eligible for this pot'
                            }
                          >
                            {isAlibi ? (
                              <span
                                className="text-sm text-text"
                                title="Alibi Doubles pairs are added from Side Actions → Pairs. Count is pair tickets this bowler signed plus appearances as partner."
                              >
                                {qty > 0 ? qty : '—'}
                              </span>
                            ) : !isEligible ? (
                              <span
                                className="inline-flex min-h-8 min-w-[4rem] items-center justify-center rounded-md border border-dashed border-border/80 bg-black/[0.05] px-2 text-xs font-medium tracking-wide text-text-muted/55 dark:border-white/15 dark:bg-white/[0.06] dark:text-white/30"
                                aria-label={`${col.name} ${pool.squad_name} for ${labelName}: not eligible`}
                              >
                                N/A
                              </span>
                            ) : pool.input_type === 'number' ? (
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="number"
                                  min={0}
                                  max={isAll ? undefined : pool.max_entries_per_user}
                                  data-roster-input=""
                                  aria-label={`${col.name} ${pool.squad_name} entries for ${labelName}`}
                                  value={
                                    editingQtyKey === draftKey
                                      ? (draftQty[draftKey] ?? String(qty))
                                      : String(qty)
                                  }
                                  title={
                                    isTeamPot
                                      ? 'Team pot — editing sets the whole team tickets (0 clears leftovers)'
                                      : isAll
                                        ? `All — estimate if generated now (${qty})`
                                        : undefined
                                  }
                                  onFocus={(e) => {
                                    editingQtyRef.current.add(draftKey);
                                    setEditingQtyKey(draftKey);
                                    setDraftQty((prev) => ({
                                      ...prev,
                                      [draftKey]: String(qty),
                                    }));
                                    selectAllOnFocus(e);
                                  }}
                                  onChange={(e) =>
                                    setDraftQty((prev) => ({
                                      ...prev,
                                      [draftKey]: e.target.value,
                                    }))
                                  }
                                  onBlur={() => {
                                    editingQtyRef.current.delete(draftKey);
                                    setEditingQtyKey((current) =>
                                      current === draftKey ? null : current
                                    );
                                    commitQuantity(actorRow, col, pool, qty, isAll);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      const el = e.currentTarget;
                                      el.blur();
                                      requestAnimationFrame(() => {
                                        focusAdjacentRosterInput(el, 1);
                                      });
                                    }
                                  }}
                                  className={`w-16 border rounded-md bg-surface-light px-2 py-1 text-sm font-medium text-text shadow-sm ${
                                    isAll
                                      ? 'border-primary ring-1 ring-primary/40'
                                      : 'border-border'
                                  }`}
                                />
                                {isBracket && (
                                  <button
                                    type="button"
                                    tabIndex={-1}
                                    onClick={() => setBracketAll(actorRow, col, pool)}
                                    title="Enter maximum pots (All). Estimate updates until generate."
                                    className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition-colors ${
                                      isAll
                                        ? 'border-primary bg-primary text-white'
                                        : 'border-border text-text-muted hover:border-primary hover:text-primary'
                                    }`}
                                  >
                                    All
                                  </button>
                                )}
                              </div>
                            ) : (
                              <div className="flex flex-col gap-0.5">
                                <input
                                  type="checkbox"
                                  data-roster-input=""
                                  checked={teamCheckboxChecked}
                                  title={
                                    isTeamPot
                                      ? 'Team pot — one entry per team (any member can toggle)'
                                      : undefined
                                  }
                                  onChange={(e) =>
                                    updateEnrolled(actorRow, col, pool, e.target.checked)
                                  }
                                  className="h-4 w-4 accent-primary"
                                  aria-label={`${col.name} ${pool.squad_name} for ${labelName}`}
                                />
                              </div>
                            )}
                          </td>
                        );
                      })
                    );

                  return (
                  <tr
                    key={display.key}
                    className={
                      isTeamRow
                        ? 'border-b border-border bg-primary/10'
                        : rowIdx % 2 === 0
                          ? 'border-b border-border bg-surface'
                          : 'border-b border-border bg-surface-light'
                    }
                  >
                    <td
                      className={`px-4 py-3 sticky left-0 bg-inherit z-[1] ${
                        !isTeamRow && display.nestedUnderTeam ? 'pl-10' : ''
                      }`}
                    >
                      {isTeamRow ? (
                        <>
                          <div className="font-semibold text-text">{display.teamName}</div>
                          <div className="text-xs text-text-muted">
                            Team · {display.members.length} bowler
                            {display.members.length === 1 ? '' : 's'}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="font-medium text-text">
                            {display.row.name}
                            {display.row.qualifying_average != null &&
                            Number.isFinite(display.row.qualifying_average) ? (
                              <span className="ml-2 font-normal text-text-muted tabular-nums">
                                Avg{' '}
                                {formatQualifyingAverage(
                                  display.row.qualifying_average
                                )}
                              </span>
                            ) : null}
                          </div>
                          {display.row.team_name && !display.nestedUnderTeam ? (
                            <div className="text-xs text-text-muted">
                              {display.row.team_name}
                            </div>
                          ) : null}
                          {display.row.usbc_id && (
                            <div className="text-xs text-text-muted">
                              USBC {display.row.usbc_id}
                            </div>
                          )}
                          {!isTeamRow &&
                          selectedSquadId != null &&
                          data?.side_actions &&
                          bracketColumns.length > 0 ? (
                            <RosterRolloverControl
                              enabled={Boolean(
                                display.row.rollover_by_squad?.[String(selectedSquadId)]
                                  ?.rollover_enabled
                              )}
                              targetIds={
                                display.row.rollover_by_squad?.[String(selectedSquadId)]
                                  ?.rollover_target_side_action_ids ?? []
                              }
                              availableBrackets={eligibleBracketSetsForSquad(
                                data.side_actions,
                                selectedSquadId,
                                display.row,
                                bracketColumns.every(
                                  (col) => col.entry_unit === 'team'
                                )
                                  ? 'team'
                                  : 'bowler'
                              )}
                              disabled={false}
                              pending={false}
                              bowlerName={String(display.row.name)}
                              onSave={(enabled, targetIds) =>
                                setSquadRollover(
                                  display.row,
                                  selectedSquadId,
                                  enabled,
                                  targetIds
                                )
                              }
                            />
                          ) : null}
                        </>
                      )}
                    </td>
                    {renderPoolCells(bracketColumns)}
                    {showAllSidepotsColumn && (
                      <td className="px-3 py-2">
                        {isTeamRow ? (
                          <span
                            className="text-xs text-text-muted"
                            title="All Sidepots enrolls individual pots on bowler lines"
                          >
                            —
                          </span>
                        ) : (
                          <button
                            type="button"
                            tabIndex={-1}
                            onClick={() => enrollAllSidepots(display.row)}
                            title="Check all eligible single-entry side pots for this bowler"
                            className="rounded border border-border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-text-muted hover:border-primary hover:text-primary"
                          >
                            All
                          </button>
                        )}
                      </td>
                    )}
                    {renderPoolCells(sidepotColumns)}
                    <td className="px-3 py-3 text-text font-medium">
                      ${owed.toFixed(2)}
                    </td>
                    <td className="px-3 py-2">
                      {isTeamRow ? (
                        <div className="flex items-center gap-2 min-w-[140px]">
                          <span className="text-sm text-text tabular-nums">
                            ${paid.toFixed(2)}
                          </span>
                          <button
                            type="button"
                            tabIndex={-1}
                            onClick={() => markTeamFullyPaid(display.members)}
                            disabled={owed <= 0}
                            title={
                              owed <= 0
                                ? 'Nothing owed'
                                : isFullyPaidRow(owed, paid)
                                  ? 'Marked as paid in full'
                                  : `Mark all members paid ($${owed.toFixed(2)})`
                            }
                            className={`shrink-0 rounded-md border px-2 py-1 text-xs font-semibold uppercase tracking-wide transition-colors ${
                              isFullyPaidRow(owed, paid)
                                ? 'border-green-600 bg-green-600 text-white'
                                : 'border-green-600 text-green-400 hover:bg-green-600/15'
                            } disabled:cursor-not-allowed disabled:opacity-40`}
                          >
                            Paid
                          </button>
                        </div>
                      ) : (
                      <div className="flex items-center gap-2 min-w-[140px]">
                        <Input
                          name={`paid-${display.row.user_id}`}
                          type="number"
                          min={0}
                          step={0.01}
                          data-roster-input=""
                          value={draftPaid[display.row.user_id] ?? '0.00'}
                          onFocus={(event) => {
                            editingPaidRef.current.add(display.row.user_id);
                            selectAllOnFocus(event);
                          }}
                          onChange={(e) =>
                            setDraftPaid((prev) => ({
                              ...prev,
                              [display.row.user_id]: e.target.value,
                            }))
                          }
                          onBlur={() => {
                            editingPaidRef.current.delete(display.row.user_id);
                            commitTotalPaid(display.row);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const el = e.currentTarget;
                              el.blur();
                              requestAnimationFrame(() => {
                                focusAdjacentRosterInput(el, 1);
                              });
                            }
                          }}
                          fullWidth
                          omitMargin
                          className="min-w-[72px] flex-1"
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => markFullyPaid(display.row)}
                          disabled={owed <= 0}
                          title={
                            owed <= 0
                              ? 'Nothing owed'
                              : isFullyPaidRow(owed, display.row.total_paid)
                                ? 'Marked as paid in full'
                                : `Mark $${owed.toFixed(2)} collected`
                          }
                          className={`shrink-0 rounded-md border px-2 py-1 text-xs font-semibold uppercase tracking-wide transition-colors ${
                            isFullyPaidRow(owed, display.row.total_paid)
                              ? 'border-green-600 bg-green-600 text-white'
                              : 'border-green-600 text-green-400 hover:bg-green-600/15'
                          } disabled:cursor-not-allowed disabled:opacity-40`}
                        >
                          Paid
                        </button>
                      </div>
                      )}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </DualHorizontalScrollTable>
        </div>
      )}
    </div>
  );
};

export default ParticipantSideActionSignupsView;
