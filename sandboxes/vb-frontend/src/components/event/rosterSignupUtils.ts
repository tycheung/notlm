import type {
  RosterSideActionColumn,
  RosterSideActionSignupRow,
} from '../../api/side-actions';

export interface ParsedSignupQuantity {
  value: number;
  shouldPersist: boolean;
  error?: string;
}

export interface ParseSignupQuantityOptions {
  /** When true, do not clamp through max_entries (All estimates may exceed template max). */
  isAll?: boolean;
}

/** Displayed roster quantity: All uses F2 `all_estimate` when present. */
export function rosterDisplayedQuantity(poolCell?: {
  quantity?: number;
  is_all?: boolean;
  all_estimate?: number | null;
} | null): number {
  if (!poolCell) return 0;
  if (poolCell.is_all) {
    const estimate = poolCell.all_estimate;
    if (estimate != null && Number.isFinite(Number(estimate))) {
      return Math.max(0, Math.trunc(Number(estimate)));
    }
  }
  return Math.max(0, Math.trunc(Number(poolCell.quantity ?? 0)));
}

/** Parse and clamp roster signup quantity input against server state and column max. */
export function parseSignupQuantityInput(
  raw: string,
  serverQty: number,
  maxEntriesPerUser: number,
  options?: ParseSignupQuantityOptions
): ParsedSignupQuantity {
  const isAll = Boolean(options?.isAll);
  const trimmed = raw.trim();
  if (trimmed === '') {
    // Empty while All: treat as undo (keep All). Empty while finite: clear to 0.
    if (isAll) {
      return { value: serverQty, shouldPersist: false };
    }
    return {
      value: 0,
      shouldPersist: serverQty !== 0,
    };
  }

  const parsed = parseInt(trimmed, 10);
  if (Number.isNaN(parsed) || parsed < 0) {
    return {
      value: serverQty,
      shouldPersist: false,
      error: 'Entry count must be a non-negative whole number.',
    };
  }

  if (isAll) {
    // Same displayed estimate → keep All intent. Different number → clear All.
    if (parsed === serverQty) {
      return { value: parsed, shouldPersist: false };
    }
    const clamped = Math.max(0, Math.min(parsed, maxEntriesPerUser));
    return {
      value: clamped,
      shouldPersist: true,
    };
  }

  const clamped = Math.max(0, Math.min(parsed, maxEntriesPerUser));
  return {
    value: clamped,
    shouldPersist: clamped !== serverQty,
  };
}

/** Billable ticket count for owed math (All intent-only markers are $0). */
export function billableEntryCount(poolCell?: {
  quantity?: number;
  is_all?: boolean;
  entry_ids?: number[];
} | null): number {
  if (!poolCell) return 0;
  if (poolCell.is_all) {
    const ids = Array.isArray(poolCell.entry_ids) ? poolCell.entry_ids.length : 0;
    // Single is_all marker = intent only (not billed until generate).
    return ids > 1 ? ids : 0;
  }
  return Math.max(0, Math.trunc(Number(poolCell.quantity ?? 0)));
}

/**
 * Side-action dollars owed for one roster row from pool qty × fee.
 * Draft quantities only apply while that cell is being edited (so team-sum
 * drafts on non-holders do not inflate every teammate's owed).
 */
export function computeRosterRowOwed(
  row: RosterSideActionSignupRow,
  columns: RosterSideActionColumn[],
  options?: {
    draftQty?: Record<string, string>;
    editingDraftKeys?: ReadonlySet<string>;
    draftKeyFor?: (
      userId: number,
      sideActionId: number,
      poolId: number
    ) => string;
    /** Limit owed to pots that belong on this row type (mixed team/bowler grid). */
    includeEntryUnits?: 'all' | 'bowler' | 'team';
  }
): number {
  const include = options?.includeEntryUnits ?? 'all';
  let total = 0;
  for (const column of columns) {
    const unit = column.entry_unit === 'team' ? 'team' : 'bowler';
    if (include !== 'all' && unit !== include) continue;
    for (const pool of column.pools) {
      const poolCell = row.signups[String(column.side_action_id)]?.pools.find(
        (candidate) => candidate.pool_id === pool.pool_id
      );
      let billable = billableEntryCount(poolCell);
      const draftKey = options?.draftKeyFor?.(
        row.user_id,
        column.side_action_id,
        pool.pool_id
      );
      const rawDraft =
        draftKey != null &&
        options?.draftQty &&
        options.editingDraftKeys?.has(draftKey)
          ? options.draftQty[draftKey]
          : undefined;
      if (rawDraft != null && rawDraft.trim() !== '') {
        const parsed = parseInt(rawDraft, 10);
        if (!Number.isNaN(parsed) && parsed >= 0) {
          // Typing a number clears All on save — treat draft as finite tickets.
          billable = parsed;
        }
      }
      total += billable * Number(pool.entry_fee || 0);
    }
  }
  return Math.round(total * 100) / 100;
}

export function parseTotalPaidInput(raw: string): { amount: number; error?: string } {
  const amount = parseFloat(raw);
  if (Number.isNaN(amount) || amount < 0) {
    return { amount: 0, error: 'Total paid must be a non-negative dollar amount.' };
  }
  return { amount };
}

export function isFullyPaid(totalOwed: number, totalPaid: number): boolean {
  return totalOwed <= 0.009 || totalPaid >= totalOwed - 0.009;
}
