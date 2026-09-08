/**
 * Canonical status normalization aligned with backend/core/status_constants.py
 */

export type PersistedRoundStatus =
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type RealtimeRoundStatusLabel = 'NOT STARTED' | 'IN PROGRESS' | 'COMPLETE';

export function normalizeRoundStatus(
  raw: string | null | undefined,
  defaultStatus: PersistedRoundStatus = 'scheduled'
): PersistedRoundStatus {
  if (!raw) return defaultStatus;
  const s = String(raw).trim().toLowerCase().replace(/-/g, '_').replace(/ /g, '_');
  if (s === 'complete' || s === 'completed') return 'completed';
  if (s === 'not_started' || s === 'notstarted') return 'scheduled';
  if (s === 'scheduled' || s === 'in_progress' || s === 'completed' || s === 'cancelled') {
    return s;
  }
  return defaultStatus;
}

export function isPersistedRoundCompleted(raw: string | null | undefined): boolean {
  return normalizeRoundStatus(raw) === 'completed';
}

export function normalizeRealtimeRoundStatus(
  raw: string | null | undefined
): RealtimeRoundStatusLabel | null {
  if (!raw) return null;
  const upper = String(raw).trim().toUpperCase();
  if (upper === 'COMPLETE' || upper === 'COMPLETED') return 'COMPLETE';
  if (upper === 'IN PROGRESS' || upper === 'IN_PROGRESS') return 'IN PROGRESS';
  if (upper === 'NOT STARTED' || upper === 'NOT_STARTED' || upper === 'SCHEDULED') {
    return 'NOT STARTED';
  }
  const persisted = normalizeRoundStatus(raw);
  if (persisted === 'completed') return 'COMPLETE';
  if (persisted === 'in_progress') return 'IN PROGRESS';
  return 'NOT STARTED';
}

export function displayLabelForPersistedRoundStatus(
  raw: string | null | undefined
): string {
  const norm = normalizeRoundStatus(raw);
  if (norm === 'completed') return 'Completed';
  if (norm === 'in_progress') return 'In progress';
  if (norm === 'cancelled') return 'Cancelled';
  return 'Scheduled';
}

export function displayLabelForRealtimeRoundStatus(
  raw: string | null | undefined
): string {
  const rt = normalizeRealtimeRoundStatus(raw);
  if (rt === 'COMPLETE') return 'Completed';
  if (rt === 'IN PROGRESS') return 'In progress';
  if (rt === 'NOT STARTED') return 'Not started';
  return displayLabelForPersistedRoundStatus(raw);
}

export function realtimeToPersistedRoundStatus(
  raw: string | null | undefined
): PersistedRoundStatus {
  const rt = normalizeRealtimeRoundStatus(raw);
  if (rt === 'COMPLETE') return 'completed';
  if (rt === 'IN PROGRESS') return 'in_progress';
  if (rt === 'NOT STARTED') return 'scheduled';
  return normalizeRoundStatus(raw);
}
