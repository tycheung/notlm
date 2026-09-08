export type BowlerSaPotLine = {
  side_action_id: number;
  name: string;
  entries: number;
  fees: number;
  winnings: number;
};

export type BowlerFinancialEvent = {
  event_id: number;
  event_name: string;
  tournament_id: number;
  tournament_name: string;
  organizer_user_id?: number | null;
  start_date: string;
  entry_fee: number | null;
  entry_fee_paid: number | null;
  prize_fund: number | null;
  side_action_entries: number;
  side_action_entry_fees: number;
  side_action_winnings: number;
  team_size?: number | null;
  team_side_action_entries?: number;
  team_side_action_entry_fees?: number;
  team_side_action_winnings?: number;
  side_action_pots?: BowlerSaPotLine[];
  team_side_action_pots?: BowlerSaPotLine[];
};

export function formatMoney(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) {
    return '—';
  }
  return `$${Number(value).toFixed(2)}`;
}

export function entryFeeDisplay(row: BowlerFinancialEvent): string {
  if (row.entry_fee_paid != null) {
    return formatMoney(row.entry_fee_paid);
  }
  return formatMoney(row.entry_fee);
}

export function sideActionEnteredDisplay(row: BowlerFinancialEvent): string {
  if (row.side_action_entries <= 0) {
    return '—';
  }
  return formatMoney(row.side_action_entry_fees);
}

export function teamSideActionEnteredDisplay(row: BowlerFinancialEvent): string {
  const entries = Number(row.team_side_action_entries || 0);
  const fees = Number(row.team_side_action_entry_fees || 0);
  if (entries <= 0 && fees <= 0) {
    return '—';
  }
  return formatMoney(fees);
}

export function teamSideActionWonDisplay(row: BowlerFinancialEvent): string {
  if (Number(row.team_side_action_winnings || 0) <= 0) {
    return '—';
  }
  return formatMoney(row.team_side_action_winnings);
}

export function teamSideActionPerMemberTitle(
  amount: number | null | undefined,
  teamSize: number | null | undefined
): string | undefined {
  const dollars = Number(amount || 0);
  const size = Number(teamSize || 0);
  if (dollars <= 0 || size <= 0) {
    return undefined;
  }
  return `${formatPerMemberAmount(dollars / size)} per team member`;
}

function formatPerMemberAmount(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  if (Math.abs(rounded - Math.round(rounded)) < 1e-9) {
    return `$${Math.round(rounded)}`;
  }
  return `$${rounded.toFixed(2)}`;
}
