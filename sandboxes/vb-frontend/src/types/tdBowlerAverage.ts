export type TdBowlerAverageRow = {
  user_id: number;
  first_name: string;
  last_name: string;
  usbc_id?: string | null;
  last_entering_average?: number | null;
  highest_entering_average?: number | null;
  td_average?: number | null;
  center_average?: number | null;
  lifetime_average?: number | null;
  events_bowled: number;
  bowling_center_id?: number | null;
  bowling_center_name?: string | null;
};

export type TdHouseAverageCenter = {
  id: number;
  name: string;
  city?: string | null;
  state?: string | null;
};

export function formatHouseAverage(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return Number(value).toFixed(1);
}

export function centerAveragePickLabel(row: TdBowlerAverageRow | undefined): string {
  const name = row?.bowling_center_name?.trim();
  return name ? `Center · ${name}` : 'Center avg';
}
