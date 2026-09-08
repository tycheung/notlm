export const LIVE_POLL_MS = 5000;
export const LIVE_POLL_JITTER_MS = 2000;

export type LivePointer = {
  event_id: number;
  round_id: number;
  version: string;
  updated_at: string;
  status: string;
};

export function isLiveScoresCdnEnabled(): boolean {
  const raw = import.meta.env.VITE_LIVE_SCORES_CDN;
  return raw === '1' || raw === 'true';
}

export function livePointerPath(eventId: number, roundId: number): string {
  return `/live/${eventId}/${roundId}/v.json`;
}

export function liveBoardPath(
  eventId: number,
  roundId: number,
  version: string
): string {
  return `/live/${eventId}/${roundId}/${encodeURIComponent(version)}.json`;
}

export function shouldPollLiveBoard(
  status: string | undefined,
  visibility: Document['visibilityState'] | string
): boolean {
  return status === 'in_progress' && visibility === 'visible';
}

export function nextLivePollDelayMs(random: () => number = Math.random): number {
  return LIVE_POLL_MS + Math.floor(random() * LIVE_POLL_JITTER_MS);
}

export function normalizeLiveAsOf(value: unknown): string | null {
  if (value == null) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  if (raw.includes('T')) return raw;
  return raw.replace(' ', 'T');
}
