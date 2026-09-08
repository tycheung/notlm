import type {
  RosterSideActionColumn,
  RosterSideActionSignupsData,
  RosterSideActionSignupPoolCell,
  RosterSideActionSignupRow,
  RosterSideActionSignupUpdate,
} from '../../api/side-actions';
import { getErrorMessage } from '../../api/apiErrors';
import { computeRosterRowOwed } from './rosterSignupUtils';

function cloneRow(row: RosterSideActionSignupRow): RosterSideActionSignupRow {
  const signups: RosterSideActionSignupRow['signups'] = {};
  for (const [key, cell] of Object.entries(row.signups ?? {})) {
    signups[key] = {
      ...cell,
      entry_ids: [...(cell.entry_ids ?? [])],
      pools: (cell.pools ?? []).map((pool) => ({
        ...pool,
        entry_ids: [...(pool.entry_ids ?? [])],
        rollover_target_side_action_ids: [
          ...(pool.rollover_target_side_action_ids ?? []),
        ],
      })),
    };
  }
  return {
    ...row,
    squad_ids: row.squad_ids ? [...row.squad_ids] : row.squad_ids,
    signups,
  };
}

function ensurePoolCell(
  row: RosterSideActionSignupRow,
  column: RosterSideActionColumn,
  poolId: number
): RosterSideActionSignupPoolCell {
  const saKey = String(column.side_action_id);
  const poolMeta = column.pools.find((pool) => pool.pool_id === poolId);
  const cell = row.signups[saKey] ?? {
    quantity: 0,
    entry_ids: [],
    pools: [],
  };
  row.signups[saKey] = cell;
  let pool = cell.pools.find((candidate) => candidate.pool_id === poolId);
  if (!pool) {
    pool = {
      pool_id: poolId,
      squad_id: poolMeta?.squad_id ?? 0,
      squad_name: poolMeta?.squad_name ?? '',
      quantity: 0,
      entry_ids: [],
      paid_count: 0,
      is_eligible: true,
    };
    cell.pools = [...cell.pools, pool];
  }
  return pool;
}

function syncSignupCellTotals(
  row: RosterSideActionSignupRow,
  sideActionId: number
): void {
  const saKey = String(sideActionId);
  const cell = row.signups[saKey];
  if (!cell) return;
  const entryIds = cell.pools.flatMap((pool) => pool.entry_ids ?? []);
  cell.quantity = cell.pools.reduce(
    (sum, pool) => sum + Math.max(0, Math.trunc(Number(pool.quantity ?? 0))),
    0
  );
  cell.entry_ids = entryIds;
}

function placeholderEntryIds(count: number, existing: number[]): number[] {
  const next = existing.slice(0, Math.max(0, count));
  while (next.length < count) {
    next.push(-(next.length + 1));
  }
  return next;
}

function applyTeamPotFlags(
  rows: RosterSideActionSignupRow[],
  teamId: number,
  sideActionId: number,
  poolId: number,
  holderUserId: number | null
): void {
  for (const row of rows) {
    if (row.team_id !== teamId) continue;
    const cell = row.signups[String(sideActionId)];
    const pool = cell?.pools.find((candidate) => candidate.pool_id === poolId);
    if (!pool) continue;
    pool.team_has_entry = holderUserId != null;
    pool.team_entry_holder_user_id = holderUserId;
  }
}

function recomputeOwed(
  row: RosterSideActionSignupRow,
  columns: RosterSideActionColumn[]
): void {
  row.total_owed = computeRosterRowOwed(row, columns);
}

/**
 * Client-side patch for roster signup cache so the TD grid updates immediately.
 * Server response remains authoritative on success.
 */
export function applyOptimisticRosterSignupUpdate(
  data: RosterSideActionSignupsData,
  request: RosterSideActionSignupUpdate
): RosterSideActionSignupsData {
  const rows = data.rows.map((row) => cloneRow(row));
  const target = rows.find((row) => row.user_id === request.user_id);
  if (!target) {
    return data;
  }

  if (request.total_paid != null && Number.isFinite(request.total_paid)) {
    target.total_paid = Math.max(0, Number(request.total_paid));
  }

  if (request.enroll_all_eligible_sidepots) {
    return { ...data, rows };
  }

  if (
    request.squad_id != null &&
    (request.rollover_enabled != null ||
      request.rollover_target_side_action_ids != null)
  ) {
    const squadKey = String(request.squad_id);
    target.rollover_by_squad = {
      ...(target.rollover_by_squad ?? {}),
      [squadKey]: {
        rollover_enabled: Boolean(request.rollover_enabled),
        rollover_target_side_action_ids: request.rollover_enabled
          ? [...(request.rollover_target_side_action_ids ?? [])]
          : [],
      },
    };
    return { ...data, rows };
  }

  if (request.side_action_id == null || request.pool_id == null) {
    recomputeOwed(target, data.side_actions);
    return { ...data, rows };
  }

  const column = data.side_actions.find(
    (candidate) => candidate.side_action_id === request.side_action_id
  );
  if (!column) {
    return { ...data, rows };
  }

  const pool = ensurePoolCell(target, column, request.pool_id);

  if (request.is_all === true) {
    pool.is_all = true;
    const estimate =
      pool.all_estimate != null && Number.isFinite(Number(pool.all_estimate))
        ? Math.max(0, Math.trunc(Number(pool.all_estimate)))
        : Math.max(0, Math.trunc(Number(pool.quantity ?? 0)));
    pool.quantity = estimate;
    // Keep a single marker id so billable stays $0 until generate.
    pool.entry_ids = placeholderEntryIds(1, pool.entry_ids);
  } else if (request.quantity != null && Number.isFinite(request.quantity)) {
    const qty = Math.max(0, Math.trunc(Number(request.quantity)));
    pool.quantity = qty;
    pool.is_all = false;
    pool.entry_ids = placeholderEntryIds(qty, pool.entry_ids);
  } else if (request.enrolled != null) {
    const qty = request.enrolled ? 1 : 0;
    pool.quantity = qty;
    pool.is_all = false;
    pool.entry_ids = placeholderEntryIds(qty, pool.entry_ids);
  }

  if (
    column.entry_unit === 'team' &&
    target.team_id != null &&
    (request.quantity != null ||
      request.enrolled != null ||
      request.is_all === true)
  ) {
    const holder =
      pool.quantity > 0 || pool.is_all ? target.user_id : null;
    applyTeamPotFlags(
      rows,
      target.team_id,
      column.side_action_id,
      request.pool_id,
      holder
    );
  }

  syncSignupCellTotals(target, column.side_action_id);
  recomputeOwed(target, data.side_actions);
  return { ...data, rows };
}

/**
 * Prefer bowler + pot context on roster signup failures so TDs can fix the right cell.
 */
export function formatRosterSignupSaveError(
  err: unknown,
  request: RosterSideActionSignupUpdate,
  data: RosterSideActionSignupsData | undefined
): string {
  const raw = getErrorMessage(err, 'Failed to save side action signup.');
  const cleaned = raw
    .replace(/^Validation error in field ['"]roster_signup['"]:\s*/i, '')
    .replace(/^Signup:\s*/i, '')
    .replace(/^Roster signup:\s*/i, '')
    .trim();

  const row = data?.rows.find((candidate) => candidate.user_id === request.user_id);
  const column = data?.side_actions.find(
    (candidate) => candidate.side_action_id === request.side_action_id
  );
  const pool = column?.pools.find((candidate) => candidate.pool_id === request.pool_id);
  const who = row?.name?.trim() || null;
  const pot = column?.name?.trim() || null;
  const squad = pool?.squad_name?.trim() || null;

  // Backend message already names the bowler — keep it as-is.
  if (who && cleaned.toLowerCase().startsWith(who.toLowerCase())) {
    return cleaned;
  }

  const where = [pot, squad].filter(Boolean).join(' · ');
  if (who && where) {
    return `${who} — ${where}: ${cleaned}`;
  }
  if (who) {
    return `${who}: ${cleaned}`;
  }
  if (where) {
    return `${where}: ${cleaned}`;
  }
  return cleaned || raw;
}
