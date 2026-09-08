import type { AbuseReport } from '../../api/abuseReports';

export type AbuseReportSnapshot = {
  games_scores_count?: number;
  event_completed_at?: string | null;
  source_deleted?: string;
  participant_status?: string;
};

export function snapshotFromReport(
  report: Pick<AbuseReport, 'snapshot'>
): AbuseReportSnapshot {
  const raw = report.snapshot;
  if (!raw || typeof raw !== 'object') return {};
  return raw as AbuseReportSnapshot;
}

export function scoresPostedLabel(count: number | undefined): string {
  if (count == null || Number.isNaN(Number(count))) {
    return 'Score count at submit was not recorded.';
  }
  const n = Number(count);
  if (n === 1) return '1 score was posted on this event at submit.';
  return `${n} scores were posted on this event at submit.`;
}

export function eventCompletedLabel(completedAt: string | null | undefined): string {
  if (!completedAt) return 'Event was not marked complete at submit.';
  return 'Event was already complete at submit.';
}

export function adminEventStandingsPath(eventId: number): string {
  return `/admin/events/${eventId}?tab=standings`;
}

export function adminEventScoringPath(eventId: number): string {
  return `/admin/events/${eventId}?tab=game_scoring`;
}

export function adminTournamentPath(tournamentId: number): string {
  return `/admin/tournaments/${tournamentId}`;
}

export function adminTournamentLivePath(
  tournamentId: number,
  eventId?: number | null
): string {
  const base = `/admin/tournaments/${tournamentId}?tab=live`;
  if (eventId == null) return base;
  return `${base}&eventId=${eventId}`;
}

export function adminBowlerPath(userId: number): string {
  return `/admin/bowlers/${userId}`;
}
