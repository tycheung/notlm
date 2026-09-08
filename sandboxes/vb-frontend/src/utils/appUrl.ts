const PRODUCTION_APP_URL = 'https://app.victorybowling.com';

/** Home URL after logout or external links — local dev stays on localhost. */
export function getAppHomeUrl(): string {
  const configured = (import.meta.env.VITE_PUBLIC_APP_URL || '').trim();
  if (configured) {
    return configured.replace(/\/+$/, '');
  }
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    return window.location.origin;
  }
  return PRODUCTION_APP_URL;
}

/** Public tournament live / standings path (in-app navigation). */
export function tournamentStandingsPath(
  tournamentId: number,
  eventId?: number | null
): string {
  const base = `/tournaments/${tournamentId}?tab=live`;
  if (eventId == null) return base;
  return `${base}&eventId=${eventId}`;
}

/** Public tournament page (info / findability). */
export function tournamentPublicLandingUrl(tournamentId: number): string {
  return `${getAppHomeUrl()}/tournaments/${tournamentId}`;
}

/** Public live / standings board. Pass eventId to land on that event's picker. */
export function tournamentPublicStandingsUrl(
  tournamentId: number,
  eventId?: number | null
): string {
  return `${getAppHomeUrl()}${tournamentStandingsPath(tournamentId, eventId)}`;
}

